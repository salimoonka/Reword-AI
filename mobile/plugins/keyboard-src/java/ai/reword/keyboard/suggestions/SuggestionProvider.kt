/**
 * SuggestionProvider - Provides autocomplete and spelling suggestions
 * Integrates SpellChecker, RussianDictionary, and Trie for comprehensive suggestions
 */

package ai.reword.keyboard.suggestions

import ai.reword.keyboard.spellcheck.RussianDictionary
import ai.reword.keyboard.spellcheck.SpellChecker
import android.content.Context
import android.util.LruCache

class SuggestionProvider private constructor(context: Context) {
    
    private val spellChecker = SpellChecker(context)
    
    // Suggestion cache for performance (max 100 entries)
    private val cache = LruCache<String, List<String>>(100)
    
    companion object {
        @Volatile
        private var instance: SuggestionProvider? = null
        
        fun getInstance(context: Context): SuggestionProvider {
            return instance ?: synchronized(this) {
                instance ?: SuggestionProvider(context.applicationContext).also {
                    instance = it
                }
            }
        }
    }
    
    /**
     * Get suggestions for current word being typed
     */
    fun getSuggestions(word: String, limit: Int = 5): List<String> {
        val trimmed = word.trim()
        if (trimmed.isEmpty()) return emptyList()
        
        // Check cache
        val cacheKey = "${trimmed}_$limit"
        cache.get(cacheKey)?.let { return it }
        
        val suggestions = mutableListOf<String>()
        
        // 1. If word is correctly spelled and in dictionary, get completions
        if (RussianDictionary.contains(trimmed)) {
            // Word is correct, maybe get longer completions
            val completions = RussianDictionary.getCompletions(trimmed, limit)
                .filter { it != trimmed.lowercase() }
            suggestions.addAll(completions)
        } else {
            // 2. Word might be partial or misspelled
            
            // Try prefix completions first
            val prefixSuggestions = RussianDictionary.getWordsWithPrefix(trimmed, limit)
            suggestions.addAll(prefixSuggestions)
            
            // If not enough, add spell corrections
            if (suggestions.size < limit) {
                val corrections = spellChecker.getSuggestions(trimmed, limit - suggestions.size)
                for (correction in corrections) {
                    if (correction !in suggestions) {
                        suggestions.add(correction)
                    }
                }
            }
            
            // Try fuzzy search if still not enough
            if (suggestions.size < limit) {
                val fuzzy = RussianDictionary.getSimilarWords(trimmed, limit)
                for (w in fuzzy) {
                    if (w !in suggestions && suggestions.size < limit) {
                        suggestions.add(w)
                    }
                }
            }
        }
        
        val result = suggestions.take(limit)
        cache.put(cacheKey, result)
        
        return result
    }
    
    /**
     * Get spelling corrections only
     */
    fun getSpellingCorrections(word: String, limit: Int = 3): List<String> {
        return spellChecker.getSuggestions(word, limit)
    }
    
    /**
     * Get autocomplete suggestions (prefix match)
     */
    fun getAutocompletions(prefix: String, limit: Int = 5): List<String> {
        return RussianDictionary.getCompletions(prefix, limit)
    }
    
    /**
     * Check if word is spelled correctly
     */
    fun isCorrectlySpelled(word: String): Boolean {
        return RussianDictionary.contains(word) || spellChecker.isWordCorrect(word)
    }
    
    /**
     * Get contextual suggestions based on previous words
     */
    fun getContextualSuggestions(
        currentWord: String,
        previousWords: List<String>,
        limit: Int = 5
    ): List<String> {
        val suggestions = getSuggestions(currentWord, limit).toMutableList()
        
        // If we have previous context, try to find common word pairs
        previousWords.lastOrNull()?.lowercase()?.let { prevWord ->
            val contextPairs = getCommonFollowingWords(prevWord, 3)
            
            // Prioritize contextually relevant suggestions
            val contextuallyRelevant = suggestions.filter { word ->
                contextPairs.contains(word.lowercase())
            }
            
            if (contextuallyRelevant.isNotEmpty()) {
                val others = suggestions.filter { it !in contextuallyRelevant }
                suggestions.clear()
                suggestions.addAll(contextuallyRelevant)
                suggestions.addAll(others)
            }
        }
        
        return suggestions.take(limit)
    }
    
    /**
     * Clear suggestion cache
     */
    fun clearCache() {
        cache.evictAll()
    }
    
    /**
     * Get words that commonly follow the given word
     */
    private fun getCommonFollowingWords(word: String, limit: Int): List<String> {
        // Common Russian word pairs (simplified)
        // In production, this would be a learned n-gram model
        val commonPairs = mapOf(
            "в" to listOf("то", "этом", "том", "котором", "конце", "начале", "общем"),
            "на" to listOf("самом", "то", "этом", "том", "мой", "него", "неё"),
            "с" to listOf("этим", "тем", "ним", "ней", "ними", "вами", "нами"),
            "и" to listOf("я", "он", "она", "мы", "вы", "они", "все"),
            "что" to listOf("это", "он", "она", "они", "мы", "вы", "я"),
            "не" to listOf("могу", "знаю", "хочу", "буду", "было", "будет", "надо"),
            "я" to listOf("не", "хочу", "могу", "знаю", "думаю", "буду", "был"),
            "он" to listOf("не", "был", "сказал", "говорит", "думает", "знает", "хочет"),
            "она" to listOf("не", "была", "сказала", "говорит", "думает", "знает", "хочет"),
            "это" to listOf("не", "было", "будет", "был", "была", "значит", "очень"),
            "как" to listOf("будто", "раз", "только", "бы", "всегда", "никогда", "можно"),
            "но" to listOf("я", "он", "она", "это", "всё", "потом", "иногда"),
            "по" to listOf("моему", "твоему", "вашему", "нашему", "крайней", "всей", "мере"),
            "если" to listOf("бы", "вы", "он", "она", "они", "не", "это"),
            "так" to listOf("как", "что", "же", "вот", "и", "или", "бы"),
            "уже" to listOf("не", "было", "давно", "почти", "совсем", "скоро", "всё"),
            "только" to listOf("что", "не", "он", "она", "это", "бы", "так"),
            "можно" to listOf("было", "сказать", "ли", "подумать", "считать", "говорить", "думать"),
            "очень" to listOf("хорошо", "плохо", "много", "мало", "быстро", "важно", "интересно"),
            "потому" to listOf("что", "как"),
            "чтобы" to listOf("не", "он", "она", "они", "вы", "мы", "быть")
        )
        
        return commonPairs[word]?.take(limit) ?: emptyList()
    }
    
    /**
     * Extract current word from text at given cursor position
     */
    fun getCurrentWord(text: String, cursorPosition: Int): String? {
        if (cursorPosition <= 0 || cursorPosition > text.length) return null
        
        // Find word start
        var startIndex = 0
        for (i in (0 until cursorPosition).reversed()) {
            val char = text[i]
            if (char.isWhitespace() || char in ".,!?;:\"'()-") {
                startIndex = i + 1
                break
            }
        }
        
        val word = text.substring(startIndex, cursorPosition)
        return if (word.isEmpty()) null else word
    }
    
    /**
     * Get previous words from text
     */
    fun getPreviousWords(text: String, cursorPosition: Int, count: Int = 3): List<String> {
        if (cursorPosition <= 0 || cursorPosition > text.length) return emptyList()
        
        val textBeforeCursor = text.substring(0, cursorPosition)
        val words = textBeforeCursor.split(Regex("[\\s.,!?;:\"'()-]+"))
            .filter { it.isNotEmpty() }
        
        // Exclude current word (last one)
        val previousWords = words.dropLast(1)
        return previousWords.takeLast(count)
    }
}
