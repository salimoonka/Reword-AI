/**
 * Data Models for Android Keyboard
 */

package ai.reword.keyboard.models

import com.google.gson.annotations.SerializedName

// MARK: - API Response
// Supports both backend snake_case AND Edge Function field names

data class ParaphraseResponse(
    @SerializedName("request_id") val requestId: String? = null,
    @SerializedName("input_text") val inputText: String? = null,
    @SerializedName("output_text") val outputText: String? = null,
    // Edge Function alternative field names
    @SerializedName("paraphrased") val paraphrased: String? = null,
    @SerializedName("corrected") val corrected: String? = null,
    @SerializedName("original") val original: String? = null,
    @SerializedName("diff") val diff: List<DiffSegment>? = null,
    @SerializedName("processing_time_ms") val processingTimeMs: Int? = null,
    @SerializedName("warnings") val warnings: List<String>? = null
) {
    /** Resolve output text from whichever field is present */
    val resolvedOutput: String get() = outputText ?: paraphrased ?: corrected ?: ""
    /** Resolve input text from whichever field is present */
    val resolvedInput: String get() = inputText ?: original ?: ""
}

data class DiffSegment(
    @SerializedName("type") val type: DiffType?,
    @SerializedName("text") val text: String
)

enum class DiffType {
    @SerializedName("equal") UNCHANGED,
    @SerializedName("delete") DELETED,
    @SerializedName("insert") INSERTED
}

// MARK: - Internal Models

data class ParaphraseResult(
    val inputText: String,
    val outputText: String,
    val diff: List<DiffSegment>,
    val warnings: List<String>
) {
    companion object {
        fun from(response: ParaphraseResponse): ParaphraseResult {
            return ParaphraseResult(
                inputText = response.resolvedInput,
                outputText = response.resolvedOutput,
                diff = response.diff ?: emptyList(),
                warnings = response.warnings ?: emptyList()
            )
        }
    }
}

data class ParaphraseRequest(
    @SerializedName("text") val text: String,
    @SerializedName("mode") val mode: String,
    @SerializedName("preserve_english") val preserveEnglish: Boolean = true,
    @SerializedName("max_length") val maxLength: Int? = null
)

// MARK: - Paraphrase Modes

enum class ParaphraseMode(
    val value: String,
    val displayName: String,
    val shortName: String,
    val emoji: String
) {
    SHORTEN("shorten", "Короче", "Короче", "📝"),
    EXPAND("expand", "Подробнее", "Больше", "📖"),
    FORMAL("formal", "Формально", "Форм.", "👔"),
    FRIENDLY("friendly", "Дружелюбно", "Друж.", "😊"),
    CONFIDENT("confident", "Уверенно", "Увер.", "💪"),
    PROFESSIONAL("professional", "Профессионально", "Проф.", "💼"),
    COLLOQUIAL("colloquial", "Разговорно", "Разг.", "💬"),
    EMPATHETIC("empathetic", "Эмпатично", "Эмпат.", "❤️");
}

// MARK: - Errors

sealed class APIError : Exception() {
    data class NetworkError(override val cause: Throwable?) : APIError()
    object InvalidResponse : APIError()
    data class ServerError(override val message: String) : APIError()
    object Unauthorized : APIError()
    object QuotaExceeded : APIError()
    object ServiceUnavailable : APIError()
    
    override val message: String
        get() = when (this) {
            is NetworkError -> "Ошибка сети: ${cause?.message}"
            InvalidResponse -> "Некорректный ответ сервера"
            is ServerError -> message
            Unauthorized -> "Необходима авторизация"
            QuotaExceeded -> "Лимит запросов исчерпан"
            ServiceUnavailable -> "Сервис временно недоступен"
        }
}

// MARK: - Settings

data class KeyboardSettings(
    val cloudEnabled: Boolean = true,
    val selectedMode: String = ParaphraseMode.PROFESSIONAL.value,
    val hapticFeedback: Boolean = true,
    val soundEffects: Boolean = false
)
