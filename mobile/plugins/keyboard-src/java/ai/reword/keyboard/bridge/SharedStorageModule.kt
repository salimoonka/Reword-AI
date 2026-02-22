/**
 * SharedStorageModule - React Native bridge to native SharedStorage
 * Allows React Native to read/write shared preferences that the keyboard extension can access
 */

package ai.reword.keyboard.bridge

import ai.reword.keyboard.storage.SharedStorage
import com.facebook.react.bridge.*
import java.util.*

class SharedStorageModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    private val storage: SharedStorage by lazy {
        SharedStorage.getInstance(reactApplicationContext)
    }
    
    override fun getName(): String = "SharedStorage"
    
    // MARK: - Authentication
    
    @ReactMethod
    fun setAuthToken(token: String, promise: Promise) {
        try {
            storage.authToken = token
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getAuthToken(promise: Promise) {
        try {
            promise.resolve(storage.authToken)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun setAuthData(
        token: String,
        refreshToken: String?,
        expiryTimestamp: Double,
        userId: String,
        promise: Promise
    ) {
        try {
            storage.setAuthData(
                token = token,
                refreshToken = refreshToken,
                expiry = Date(expiryTimestamp.toLong()),
                userId = userId
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun clearAuthData(promise: Promise) {
        try {
            storage.clearAuthData()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun isAuthenticated(promise: Promise) {
        try {
            promise.resolve(storage.isAuthenticated)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    // MARK: - Preferences
    
    @ReactMethod
    fun setSelectedMode(mode: String, promise: Promise) {
        try {
            storage.selectedMode = mode
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getSelectedMode(promise: Promise) {
        try {
            promise.resolve(storage.selectedMode)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun setAutoCorrect(enabled: Boolean, promise: Promise) {
        try {
            storage.autoCorrectEnabled = enabled
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getAutoCorrect(promise: Promise) {
        try {
            promise.resolve(storage.autoCorrectEnabled)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun setSoundEnabled(enabled: Boolean, promise: Promise) {
        try {
            storage.soundEnabled = enabled
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun setHapticEnabled(enabled: Boolean, promise: Promise) {
        try {
            storage.hapticEnabled = enabled
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun setShowSuggestions(enabled: Boolean, promise: Promise) {
        try {
            storage.showSuggestions = enabled
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getPreferences(promise: Promise) {
        try {
            val map = Arguments.createMap()
            map.putString("selectedMode", storage.selectedMode)
            map.putBoolean("autoCorrect", storage.autoCorrectEnabled)
            map.putBoolean("soundEnabled", storage.soundEnabled)
            map.putBoolean("hapticEnabled", storage.hapticEnabled)
            map.putBoolean("showSuggestions", storage.showSuggestions)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    // MARK: - Subscription
    
    @ReactMethod
    fun setIsPremium(isPremium: Boolean, promise: Promise) {
        try {
            storage.isPremium = isPremium
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getIsPremium(promise: Promise) {
        try {
            promise.resolve(storage.isPremium)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun setDailyLimit(limit: Int, promise: Promise) {
        try {
            storage.dailyLimit = limit
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getRemainingQuota(promise: Promise) {
        try {
            promise.resolve(storage.remainingQuota)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getSubscriptionInfo(promise: Promise) {
        try {
            val map = Arguments.createMap()
            map.putBoolean("isPremium", storage.isPremium)
            map.putInt("dailyLimit", storage.dailyLimit)
            map.putInt("remainingQuota", storage.remainingQuota)
            storage.subscriptionExpiry?.let {
                map.putDouble("expiryTimestamp", it.time.toDouble())
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    // MARK: - Usage Stats
    
    @ReactMethod
    fun getUsageStats(promise: Promise) {
        try {
            val map = Arguments.createMap()
            map.putInt("totalParaphrases", storage.totalParaphrases)
            map.putInt("dailyParaphrases", storage.dailyParaphrases)
            map.putInt("remainingQuota", storage.remainingQuota)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun incrementUsage(promise: Promise) {
        try {
            storage.incrementUsage()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    // MARK: - Cache
    
    @ReactMethod
    fun getRecentParaphrases(promise: Promise) {
        try {
            val array = Arguments.createArray()
            storage.recentParaphrases.forEach { item ->
                val map = Arguments.createMap()
                item.forEach { (key, value) -> map.putString(key, value) }
                array.pushMap(map)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun addRecentParaphrase(original: String, result: String, mode: String, promise: Promise) {
        try {
            storage.addRecentParaphrase(original, result, mode)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getCustomDictionary(promise: Promise) {
        try {
            val array = Arguments.createArray()
            storage.customDictionary.forEach { array.pushString(it) }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun addToDictionary(word: String, promise: Promise) {
        try {
            storage.addToDictionary(word)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    // MARK: - API Configuration
    
    @ReactMethod
    fun setApiBaseUrl(url: String, promise: Promise) {
        try {
            storage.apiBaseUrl = url
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getApiBaseUrl(promise: Promise) {
        try {
            promise.resolve(storage.apiBaseUrl)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    // MARK: - Generic Key-Value
    
    @ReactMethod
    fun setValue(key: String, value: Dynamic, promise: Promise) {
        try {
            when (value.type) {
                ReadableType.String -> storage.setValue(key, value.asString())
                ReadableType.Number -> storage.setValue(key, value.asDouble())
                ReadableType.Boolean -> storage.setValue(key, value.asBoolean())
                ReadableType.Null -> storage.setValue(key, null)
                else -> storage.setValue(key, value.toString())
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getValue(key: String, promise: Promise) {
        try {
            when (val value = storage.getValue(key)) {
                is String -> promise.resolve(value)
                is Int -> promise.resolve(value)
                is Long -> promise.resolve(value.toDouble())
                is Float -> promise.resolve(value.toDouble())
                is Boolean -> promise.resolve(value)
                null -> promise.resolve(null)
                else -> promise.resolve(value.toString())
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun getAllKeys(promise: Promise) {
        try {
            val array = Arguments.createArray()
            storage.getAllKeys().forEach { array.pushString(it) }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    // MARK: - Utility
    
    @ReactMethod
    fun clearAll(promise: Promise) {
        try {
            storage.clearAll()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
