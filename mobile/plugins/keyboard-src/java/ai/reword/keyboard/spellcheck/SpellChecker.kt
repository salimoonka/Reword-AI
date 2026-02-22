/**
 * SpellChecker - Local spell checking service for Android
 * Uses Android's SpellCheckerSession and custom dictionary
 */

package ai.reword.keyboard.spellcheck

import android.content.Context
import android.view.textservice.*
import java.util.Locale

class SpellChecker(private val context: Context) : SpellCheckerSession.SpellCheckerSessionListener {
    
    // MARK: - Properties
    
    private var spellCheckerSession: SpellCheckerSession? = null
    private val customWords: MutableSet<String> = mutableSetOf()
    private val cache: MutableMap<String, List<SpellCheckResult>> = mutableMapOf()
    private val cacheLimit = 1000
    
    private var pendingCallback: ((List<SpellCheckResult>) -> Unit)? = null
    private var pendingText: String = ""
    
    companion object {
        @Volatile
        private var instance: SpellChecker? = null
        
        fun getInstance(context: Context): SpellChecker {
            return instance ?: synchronized(this) {
                instance ?: SpellChecker(context.applicationContext).also { instance = it }
            }
        }
    }
    
    init {
        initSpellChecker()
        loadCustomDictionary()
    }
    
    // MARK: - Initialization
    
    private fun initSpellChecker() {
        val tsm = context.getSystemService(Context.TEXT_SERVICES_MANAGER_SERVICE) as? TextServicesManager
        spellCheckerSession = tsm?.newSpellCheckerSession(
            null,
            Locale("ru"),
            this,
            true
        )
    }
    
    // MARK: - Public Methods
    
    /**
     * Check spelling for entire text (synchronous with cache)
     */
    fun checkSpellingSync(text: String): List<SpellCheckResult> {
        // Check cache first
        cache[text]?.let { return it }
        
        val results = mutableListOf<SpellCheckResult>()
        val words = tokenize(text)
        
        for (word in words) {
            // Skip custom words
            if (customWords.contains(word.text.lowercase())) {
                continue
            }
            
            // Skip English words
            if (isEnglishWord(word.text)) {
                continue
            }
            
            // Basic spell check using dictionary lookup
            if (!isWordCorrect(word.text)) {
                val suggestions = getSuggestions(word.text)
                results.add(SpellCheckResult(
                    word = word.text,
                    startIndex = word.startIndex,
                    endIndex = word.endIndex,
                    suggestions = suggestions,
                    type = SpellCheckType.MISSPELLING
                ))
            }
        }
        
        // Cache result
        if (cache.size >= cacheLimit) {
            cache.clear()
        }
        cache[text] = results
        
        return results
    }
    
    /**
     * Check spelling asynchronously using system spell checker
     */
    fun checkSpellingAsync(text: String, callback: (List<SpellCheckResult>) -> Unit) {
        pendingCallback = callback
        pendingText = text
        
        val textInfo = TextInfo(text)
        spellCheckerSession?.getSuggestions(textInfo, 5)
    }
    
    /**
     * Check if single word is spelled correctly
     */
    fun isWordCorrect(word: String): Boolean {
        if (customWords.contains(word.lowercase())) {
            return true
        }
        
        if (isEnglishWord(word)) {
            return true
        }
        
        // Use Russian dictionary check
        return RussianDictionary.contains(word.lowercase())
    }
    
    /**
     * Get spelling suggestions for a word
     */
    fun getSuggestions(word: String, limit: Int = 5): List<String> {
        val suggestions = mutableListOf<String>()
        
        // Get suggestions from dictionary using Levenshtein distance
        val candidates = RussianDictionary.getSimilarWords(word.lowercase(), limit * 2)
        
        // Sort by Levenshtein distance
        candidates.sortedBy { levenshteinDistance(it, word.lowercase()) }
            .take(limit)
            .forEach { suggestions.add(it) }
        
        return suggestions
    }
    
    /**
     * Add word to custom dictionary
     */
    fun addToCustomDictionary(word: String) {
        customWords.add(word.lowercase())
        saveCustomDictionary()
    }
    
    /**
     * Remove word from custom dictionary
     */
    fun removeFromCustomDictionary(word: String) {
        customWords.remove(word.lowercase())
        saveCustomDictionary()
    }
    
    /**
     * Clear cache
     */
    fun clearCache() {
        cache.clear()
    }
    
    // MARK: - SpellCheckerSessionListener
    
    override fun onGetSuggestions(results: Array<out SuggestionsInfo>?) {
        results?.let { suggestionsArray ->
            val spellResults = mutableListOf<SpellCheckResult>()
            val words = tokenize(pendingText)
            
            for ((index, suggestionsInfo) in suggestionsArray.withIndex()) {
                if (index < words.size) {
                    val word = words[index]
                    val attrs = suggestionsInfo.suggestionsAttributes
                    
                    // Check if word is misspelled
                    if (attrs and SuggestionsInfo.RESULT_ATTR_LOOKS_LIKE_TYPO != 0 ||
                        attrs and SuggestionsInfo.RESULT_ATTR_HAS_RECOMMENDED_SUGGESTIONS != 0) {
                        
                        val suggestions = mutableListOf<String>()
                        for (i in 0 until suggestionsInfo.suggestionsCount) {
                            suggestions.add(suggestionsInfo.getSuggestionAt(i))
                        }
                        
                        spellResults.add(SpellCheckResult(
                            word = word.text,
                            startIndex = word.startIndex,
                            endIndex = word.endIndex,
                            suggestions = suggestions,
                            type = SpellCheckType.MISSPELLING
                        ))
                    }
                }
            }
            
            pendingCallback?.invoke(spellResults)
        }
    }
    
    override fun onGetSentenceSuggestions(results: Array<out SentenceSuggestionsInfo>?) {
        // Handle sentence-level suggestions if needed
    }
    
    // MARK: - Private Methods
    
    private fun tokenize(text: String): List<WordToken> {
        val tokens = mutableListOf<WordToken>()
        val pattern = Regex("\\p{L}+")
        
        pattern.findAll(text).forEach { match ->
            tokens.add(WordToken(
                text = match.value,
                startIndex = match.range.first,
                endIndex = match.range.last + 1
            ))
        }
        
        return tokens
    }
    
    private fun isEnglishWord(word: String): Boolean {
        return word.matches(Regex("^[a-zA-Z]+$"))
    }
    
    private fun levenshteinDistance(s1: String, s2: String): Int {
        val m = s1.length
        val n = s2.length
        
        if (m == 0) return n
        if (n == 0) return m
        
        val matrix = Array(m + 1) { IntArray(n + 1) }
        
        for (i in 0..m) matrix[i][0] = i
        for (j in 0..n) matrix[0][j] = j
        
        for (i in 1..m) {
            for (j in 1..n) {
                val cost = if (s1[i - 1] == s2[j - 1]) 0 else 1
                matrix[i][j] = minOf(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                )
            }
        }
        
        return matrix[m][n]
    }
    
    // MARK: - Persistence
    
    private fun loadCustomDictionary() {
        val prefs = context.getSharedPreferences("reword_shared_prefs", Context.MODE_PRIVATE)
        val words = prefs.getStringSet("customDictionary", emptySet()) ?: emptySet()
        customWords.addAll(words)
    }
    
    private fun saveCustomDictionary() {
        val prefs = context.getSharedPreferences("reword_shared_prefs", Context.MODE_PRIVATE)
        prefs.edit().putStringSet("customDictionary", customWords).apply()
    }
}

// MARK: - Models

data class WordToken(
    val text: String,
    val startIndex: Int,
    val endIndex: Int
)

data class SpellCheckResult(
    val word: String,
    val startIndex: Int,
    val endIndex: Int,
    val suggestions: List<String>,
    val type: SpellCheckType
)

enum class SpellCheckType {
    MISSPELLING,
    GRAMMAR,
    PUNCTUATION
}
