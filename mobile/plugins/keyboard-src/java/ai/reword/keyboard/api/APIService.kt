/**
 * APIService - Backend Communication for Android
 */

package ai.reword.keyboard.api

import android.content.Context
import ai.reword.keyboard.models.*
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class APIService(private val context: Context) {

    private val gson = Gson()

    // Read from SharedPreferences — MUST match SharedStorage.PREFS_NAME
    private val PREFS_NAME = "reword_shared_prefs"

    private val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbWZzb2hydmN4YXRnbndlemZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjExMDEsImV4cCI6MjA4NjkzNzEwMX0.SDX9qdpqz2_vX9iN5hxqCR6BYF1LbMBQ7fxak3npLUo"

    private val baseURL: String
        get() {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString("api_base_url", "https://reword-ai.onrender.com") ?: "https://reword-ai.onrender.com"
        }

    private val authToken: String?
        get() {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString("auth_token", null)
        }

    suspend fun paraphrase(text: String, mode: ParaphraseMode): ParaphraseResult {
        val token = authToken  // may be null — Edge Functions don't require JWT

        val request = ParaphraseRequest(
            text = text,
            mode = mode.value,
            preserveEnglish = true
        )

        val response = makeRequest<ParaphraseResponse>(
            endpoint = "/v1/paraphrase",
            method = "POST",
            body = gson.toJson(request),
            token = token
        )

        return ParaphraseResult.from(response)
    }

    suspend fun checkGrammar(text: String): ParaphraseResult {
        val token = authToken  // may be null

        val body = mapOf("text" to text)

        val response = makeRequest<ParaphraseResponse>(
            endpoint = "/v1/check",
            method = "POST",
            body = gson.toJson(body),
            token = token
        )

        return ParaphraseResult.from(response)
    }

    private suspend inline fun <reified T> makeRequest(
        endpoint: String,
        method: String,
        body: String?,
        token: String?
    ): T = withContext(Dispatchers.IO) {
        val url = URL(baseURL + endpoint)
        val connection = url.openConnection() as HttpURLConnection

        try {
            connection.apply {
                requestMethod = method
                setRequestProperty("Content-Type", "application/json")
                if (!token.isNullOrEmpty()) {
                    setRequestProperty("Authorization", "Bearer $token")
                }
                setRequestProperty("apikey", SUPABASE_ANON_KEY)
                connectTimeout = 30000
                readTimeout = 30000
                doInput = true

                if (body != null && method != "GET") {
                    doOutput = true
                    OutputStreamWriter(outputStream).use { writer ->
                        writer.write(body)
                        writer.flush()
                    }
                }
            }

            val responseCode = connection.responseCode
            val responseBody = if (responseCode in 200..299) {
                connection.inputStream.bufferedReader().use { it.readText() }
            } else {
                connection.errorStream?.bufferedReader()?.use { it.readText() } ?: ""
            }

            when (responseCode) {
                in 200..299 -> {
                    gson.fromJson(responseBody, T::class.java)
                        ?: throw APIError.InvalidResponse
                }
                401 -> throw APIError.Unauthorized
                429 -> throw APIError.QuotaExceeded
                503 -> throw APIError.ServiceUnavailable
                else -> {
                    val errorResponse = try {
                        gson.fromJson(responseBody, ErrorResponse::class.java)
                    } catch (e: Exception) {
                        null
                    }
                    throw APIError.ServerError(errorResponse?.error ?: "Ошибка сервера")
                }
            }
        } catch (e: Exception) {
            when (e) {
                is APIError -> throw e
                else -> throw APIError.NetworkError(e)
            }
        } finally {
            connection.disconnect()
        }
    }
}

private data class ErrorResponse(val error: String)
