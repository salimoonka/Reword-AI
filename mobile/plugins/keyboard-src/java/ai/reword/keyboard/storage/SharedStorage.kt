/**
 * SharedStorage - SharedPreferences wrapper for sharing data between main app and keyboard service
 * Uses SharedPreferences with MODE_MULTI_PROCESS for cross-process access
 */

package ai.reword.keyboard.storage

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class SharedStorage private constructor(context: Context) {
    
    companion object {
        private const val PREFS_NAME = "reword_shared_prefs"
        
        @Volatile
        private var instance: SharedStorage? = null
        
        fun getInstance(context: Context): SharedStorage {
            return instance ?: synchronized(this) {
                instance ?: SharedStorage(context.applicationContext).also {
                    instance = it
                }
            }
        }
        
        // Storage keys
        object Keys {
            // Authentication
            const val AUTH_TOKEN = "auth_token"
            const val REFRESH_TOKEN = "refresh_token"
            const val TOKEN_EXPIRY = "token_expiry"
            const val USER_ID = "user_id"
            
            // API
            const val API_BASE_URL = "api_base_url"
            
            // User preferences
            const val SELECTED_MODE = "selected_mode"
            const val AUTO_CORRECT = "auto_correct_enabled"
            const val SOUND_ENABLED = "sound_enabled"
            const val HAPTIC_ENABLED = "haptic_enabled"
            const val SHOW_SUGGESTIONS = "show_suggestions"
            
            // Usage stats
            const val TOTAL_PARAPHRASES = "total_paraphrases"
            const val DAILY_PARAPHRASES = "daily_paraphrases"
            const val LAST_USAGE_DATE = "last_usage_date"
            
            // Subscription
            const val IS_PREMIUM = "is_premium"
            const val SUBSCRIPTION_EXPIRY = "subscription_expiry"
            const val DAILY_LIMIT = "daily_limit"
            const val REMAINING_QUOTA = "remaining_quota"
            
            // Cache
            const val RECENT_PARAPHRASES = "recent_paraphrases"
            const val CUSTOM_DICTIONARY = "custom_dictionary"
            
            // Sync
            const val LAST_SYNC_TIME = "last_sync_time"
            const val PENDING_SYNC = "pending_sync"
        }
    }
    
    private val prefs: SharedPreferences = context.getSharedPreferences(
        PREFS_NAME,
        Context.MODE_PRIVATE
    )
    
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    
    // MARK: - Authentication
    
    var authToken: String?
        get() = prefs.getString(Keys.AUTH_TOKEN, null)
        set(value) = prefs.edit().putString(Keys.AUTH_TOKEN, value).apply()
    
    var refreshToken: String?
        get() = prefs.getString(Keys.REFRESH_TOKEN, null)
        set(value) = prefs.edit().putString(Keys.REFRESH_TOKEN, value).apply()
    
    var tokenExpiry: Date?
        get() {
            val timestamp = prefs.getLong(Keys.TOKEN_EXPIRY, 0)
            return if (timestamp > 0) Date(timestamp) else null
        }
        set(value) = prefs.edit().putLong(Keys.TOKEN_EXPIRY, value?.time ?: 0).apply()
    
    var userId: String?
        get() = prefs.getString(Keys.USER_ID, null)
        set(value) = prefs.edit().putString(Keys.USER_ID, value).apply()
    
    val isAuthenticated: Boolean
        get() {
            val token = authToken
            if (token.isNullOrEmpty()) return false
            val expiry = tokenExpiry
            if (expiry != null && expiry.before(Date())) return false
            return true
        }
    
    var apiBaseUrl: String
        get() = prefs.getString(Keys.API_BASE_URL, "https://wlmfsohrvcxatgnwezfy.supabase.co/functions") ?: "https://wlmfsohrvcxatgnwezfy.supabase.co/functions"
        set(value) = prefs.edit().putString(Keys.API_BASE_URL, value).apply()
    
    fun setAuthData(token: String, refreshToken: String?, expiry: Date, userId: String) {
        prefs.edit()
            .putString(Keys.AUTH_TOKEN, token)
            .putString(Keys.REFRESH_TOKEN, refreshToken)
            .putLong(Keys.TOKEN_EXPIRY, expiry.time)
            .putString(Keys.USER_ID, userId)
            .apply()
    }
    
    fun clearAuthData() {
        prefs.edit()
            .remove(Keys.AUTH_TOKEN)
            .remove(Keys.REFRESH_TOKEN)
            .remove(Keys.TOKEN_EXPIRY)
            .remove(Keys.USER_ID)
            .apply()
    }
    
    // MARK: - User Preferences
    
    var selectedMode: String
        get() = prefs.getString(Keys.SELECTED_MODE, "lite") ?: "lite"
        set(value) = prefs.edit().putString(Keys.SELECTED_MODE, value).apply()
    
    var autoCorrectEnabled: Boolean
        get() = prefs.getBoolean(Keys.AUTO_CORRECT, true)
        set(value) = prefs.edit().putBoolean(Keys.AUTO_CORRECT, value).apply()
    
    var soundEnabled: Boolean
        get() = prefs.getBoolean(Keys.SOUND_ENABLED, true)
        set(value) = prefs.edit().putBoolean(Keys.SOUND_ENABLED, value).apply()
    
    var hapticEnabled: Boolean
        get() = prefs.getBoolean(Keys.HAPTIC_ENABLED, true)
        set(value) = prefs.edit().putBoolean(Keys.HAPTIC_ENABLED, value).apply()
    
    var showSuggestions: Boolean
        get() = prefs.getBoolean(Keys.SHOW_SUGGESTIONS, true)
        set(value) = prefs.edit().putBoolean(Keys.SHOW_SUGGESTIONS, value).apply()
    
    // MARK: - Subscription
    
    var isPremium: Boolean
        get() = prefs.getBoolean(Keys.IS_PREMIUM, false)
        set(value) = prefs.edit().putBoolean(Keys.IS_PREMIUM, value).apply()
    
    var subscriptionExpiry: Date?
        get() {
            val timestamp = prefs.getLong(Keys.SUBSCRIPTION_EXPIRY, 0)
            return if (timestamp > 0) Date(timestamp) else null
        }
        set(value) = prefs.edit().putLong(Keys.SUBSCRIPTION_EXPIRY, value?.time ?: 0).apply()
    
    var dailyLimit: Int
        get() = prefs.getInt(Keys.DAILY_LIMIT, 10) // Free tier default
        set(value) = prefs.edit().putInt(Keys.DAILY_LIMIT, value).apply()
    
    var remainingQuota: Int
        get() = prefs.getInt(Keys.REMAINING_QUOTA, 10)
        set(value) = prefs.edit().putInt(Keys.REMAINING_QUOTA, value).apply()
    
    // MARK: - Usage Stats
    
    var totalParaphrases: Int
        get() = prefs.getInt(Keys.TOTAL_PARAPHRASES, 0)
        set(value) = prefs.edit().putInt(Keys.TOTAL_PARAPHRASES, value).apply()
    
    var dailyParaphrases: Int
        get() {
            // Reset if it's a new day
            val lastDateStr = prefs.getString(Keys.LAST_USAGE_DATE, null)
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
            
            if (lastDateStr != today) {
                prefs.edit()
                    .putInt(Keys.DAILY_PARAPHRASES, 0)
                    .putString(Keys.LAST_USAGE_DATE, today)
                    .apply()
                
                // Reset remaining quota for free users
                if (!isPremium) {
                    remainingQuota = dailyLimit
                }
            }
            
            return prefs.getInt(Keys.DAILY_PARAPHRASES, 0)
        }
        set(value) {
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
            prefs.edit()
                .putInt(Keys.DAILY_PARAPHRASES, value)
                .putString(Keys.LAST_USAGE_DATE, today)
                .apply()
        }
    
    fun incrementUsage() {
        totalParaphrases += 1
        dailyParaphrases += 1
        if (remainingQuota > 0) {
            remainingQuota -= 1
        }
    }
    
    // MARK: - Cache
    
    var recentParaphrases: List<Map<String, String>>
        get() {
            val jsonStr = prefs.getString(Keys.RECENT_PARAPHRASES, null) ?: return emptyList()
            return try {
                val jsonArray = JSONArray(jsonStr)
                (0 until jsonArray.length()).map { i ->
                    val obj = jsonArray.getJSONObject(i)
                    mapOf(
                        "original" to obj.optString("original", ""),
                        "result" to obj.optString("result", ""),
                        "mode" to obj.optString("mode", ""),
                        "timestamp" to obj.optString("timestamp", "")
                    )
                }
            } catch (e: Exception) {
                emptyList()
            }
        }
        set(value) {
            val limited = value.takeLast(20)
            val jsonArray = JSONArray()
            limited.forEach { map ->
                val obj = JSONObject()
                map.forEach { (key, v) -> obj.put(key, v) }
                jsonArray.put(obj)
            }
            prefs.edit().putString(Keys.RECENT_PARAPHRASES, jsonArray.toString()).apply()
        }
    
    fun addRecentParaphrase(original: String, result: String, mode: String) {
        val recent = recentParaphrases.toMutableList()
        recent.add(mapOf(
            "original" to original,
            "result" to result,
            "mode" to mode,
            "timestamp" to dateFormat.format(Date())
        ))
        recentParaphrases = recent
    }
    
    var customDictionary: List<String>
        get() {
            val str = prefs.getString(Keys.CUSTOM_DICTIONARY, null) ?: return emptyList()
            return str.split(",").filter { it.isNotEmpty() }
        }
        set(value) {
            prefs.edit().putString(Keys.CUSTOM_DICTIONARY, value.joinToString(",")).apply()
        }
    
    fun addToDictionary(word: String) {
        val dict = customDictionary.toMutableList()
        val lowercased = word.lowercase()
        if (lowercased !in dict) {
            dict.add(lowercased)
            customDictionary = dict
        }
    }
    
    // MARK: - Sync
    
    var lastSyncTime: Date?
        get() {
            val timestamp = prefs.getLong(Keys.LAST_SYNC_TIME, 0)
            return if (timestamp > 0) Date(timestamp) else null
        }
        set(value) = prefs.edit().putLong(Keys.LAST_SYNC_TIME, value?.time ?: 0).apply()
    
    var hasPendingSync: Boolean
        get() = prefs.getBoolean(Keys.PENDING_SYNC, false)
        set(value) = prefs.edit().putBoolean(Keys.PENDING_SYNC, value).apply()
    
    // MARK: - Utility
    
    fun clearAll() {
        prefs.edit().clear().apply()
    }
    
    /**
     * Export all data as map (for debugging)
     */
    fun exportData(): Map<String, Any?> {
        return prefs.all
    }
    
    // MARK: - React Native Bridge Support
    
    /**
     * Set value from React Native (supports basic types)
     */
    fun setValue(key: String, value: Any?) {
        val editor = prefs.edit()
        when (value) {
            is String -> editor.putString(key, value)
            is Int -> editor.putInt(key, value)
            is Long -> editor.putLong(key, value)
            is Float -> editor.putFloat(key, value)
            is Boolean -> editor.putBoolean(key, value)
            null -> editor.remove(key)
            else -> editor.putString(key, value.toString())
        }
        editor.apply()
    }
    
    /**
     * Get value for React Native
     */
    fun getValue(key: String): Any? {
        return prefs.all[key]
    }
    
    /**
     * Get all keys for React Native
     */
    fun getAllKeys(): Set<String> {
        return prefs.all.keys
    }
}
