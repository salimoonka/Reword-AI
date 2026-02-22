/**
 * PunctuationRulesEngine - Russian punctuation correction engine
 * Handles common Russian punctuation patterns and corrections
 */

package ai.reword.keyboard.punctuation

object PunctuationRulesEngine {
    
    /**
     * Words that typically require comma before them in subordinate clauses
     */
    private val commaBeforeWords = setOf(
        // Subordinate conjunctions
        "что", "чтобы", "который", "которая", "которое", "которые",
        "когда", "если", "пока", "хотя", "потому", "поэтому",
        "так как", "после того как", "в то время как",
        "несмотря на то что", "благодаря тому что",
        "ввиду того что", "вследствие того что",
        "перед тем как", "прежде чем",
        
        // Relative pronouns
        "где", "куда", "откуда", "кто", "как",
        
        // Other subordinating words
        "чем", "словно", "будто", "точно", "подобно тому как"
    )
    
    /**
     * Words that require comma after them at the beginning of a sentence
     */
    private val commaAfterWords = setOf(
        // Introductory words
        "однако", "впрочем", "следовательно", "таким образом",
        "итак", "значит", "например", "напротив", "наоборот",
        "во-первых", "во-вторых", "в-третьих", "наконец",
        "кроме того", "более того", "кстати", "между прочим",
        "по-моему", "по-твоему", "по-вашему", "по-нашему",
        "к счастью", "к сожалению", "к несчастью",
        "к удивлению", "к радости",
        "конечно", "разумеется", "безусловно", "несомненно",
        "возможно", "вероятно", "очевидно", "видимо",
        "действительно", "правда", "честно говоря"
    )
    
    /**
     * Apply punctuation corrections to text
     */
    fun correctPunctuation(text: String): String {
        var result = text
        
        result = fixCommasBeforeSubordinateClauses(result)
        result = fixCommasAfterIntroductoryWords(result)
        result = fixSpaceAfterPunctuation(result)
        result = fixSpaceBeforePunctuation(result)
        result = fixRussianQuotes(result)
        result = fixDashes(result)
        result = fixMultiplePunctuation(result)
        result = capitalizeAfterSentenceEnd(result)
        
        return result
    }
    
    /**
     * Get punctuation suggestions for text
     */
    fun getSuggestions(text: String): List<PunctuationSuggestion> {
        val suggestions = mutableListOf<PunctuationSuggestion>()
        
        suggestions.addAll(checkMissingCommasBeforeSubordinateClauses(text))
        suggestions.addAll(checkMissingCommasAfterIntroductoryWords(text))
        suggestions.addAll(checkSpacingIssues(text))
        suggestions.addAll(checkQuoteIssues(text))
        
        return suggestions
    }
    
    /**
     * Fix commas before subordinate clauses
     */
    private fun fixCommasBeforeSubordinateClauses(text: String): String {
        var result = text
        
        for (word in commaBeforeWords) {
            // Pattern: word boundary + no comma + subordinate word
            // But not at the start of sentence
            val pattern = "(?<=[а-яё])\\s+($word)(?=\\s)".toRegex(RegexOption.IGNORE_CASE)
            result = result.replace(pattern, ", $1")
        }
        
        return result
    }
    
    /**
     * Fix commas after introductory words
     */
    private fun fixCommasAfterIntroductoryWords(text: String): String {
        var result = text
        
        for (word in commaAfterWords) {
            // Pattern: start of sentence or after period + word + no comma
            val patternStart = "^($word)\\s+(?=[а-яёА-ЯЁ])".toRegex(RegexOption.IGNORE_CASE)
            val patternAfterSentence = "(?<=[.!?]\\s)($word)\\s+(?=[а-яёА-ЯЁ])".toRegex(RegexOption.IGNORE_CASE)
            
            result = result.replace(patternStart, "$1, ")
            result = result.replace(patternAfterSentence, "$1, ")
        }
        
        return result
    }
    
    /**
     * Fix space after punctuation marks
     */
    private fun fixSpaceAfterPunctuation(text: String): String {
        // Add space after punctuation if followed by letter
        val pattern = "([,;:.!?])([а-яёА-ЯЁa-zA-Z])".toRegex()
        return text.replace(pattern, "$1 $2")
    }
    
    /**
     * Fix space before punctuation marks (remove extra spaces)
     */
    private fun fixSpaceBeforePunctuation(text: String): String {
        val pattern = "\\s+([,;:.!?])".toRegex()
        return text.replace(pattern, "$1")
    }
    
    /**
     * Fix Russian quotes (use « » instead of " ")
     */
    private fun fixRussianQuotes(text: String): String {
        var result = text
        
        // Replace straight quotes with Russian quotes
        // Opening quote (after space or start)
        val openingPattern = "(?<=\\s|^)\"(?=[а-яёА-ЯЁ])".toRegex()
        result = result.replace(openingPattern, "«")
        
        // Closing quote (after letter or punctuation)
        val closingPattern = "(?<=[а-яёА-ЯЁ.,!?])\"(?=\\s|\$|[.,!?])".toRegex()
        result = result.replace(closingPattern, "»")
        
        return result
    }
    
    /**
     * Fix dashes (use em-dash — instead of hyphen - or double hyphen --)
     */
    private fun fixDashes(text: String): String {
        val pattern = "\\s+-{1,2}\\s+".toRegex()
        return text.replace(pattern, " — ")
    }
    
    /**
     * Fix multiple punctuation (e.g., ...... -> …, !! -> !)
     */
    private fun fixMultiplePunctuation(text: String): String {
        var result = text
        
        val patterns = listOf(
            "\\.{3,}".toRegex() to "…",      // Multiple dots to ellipsis
            "!{2,}".toRegex() to "!",        // Multiple exclamation to single
            "\\?{2,}".toRegex() to "?",      // Multiple question to single
            ",{2,}".toRegex() to ",",        // Multiple commas to single
        )
        
        for ((pattern, replacement) in patterns) {
            result = result.replace(pattern, replacement)
        }
        
        return result
    }
    
    /**
     * Capitalize first letter after sentence end
     */
    private fun capitalizeAfterSentenceEnd(text: String): String {
        val pattern = "([.!?…])\\s+([а-яё])".toRegex()
        
        return text.replace(pattern) { matchResult ->
            val punctuation = matchResult.groupValues[1]
            val letter = matchResult.groupValues[2]
            "$punctuation ${letter.uppercase()}"
        }
    }
    
    /**
     * Check for missing commas before subordinate clauses
     */
    private fun checkMissingCommasBeforeSubordinateClauses(text: String): List<PunctuationSuggestion> {
        val suggestions = mutableListOf<PunctuationSuggestion>()
        val words = text.lowercase().split("\\s+".toRegex())
        
        for ((index, word) in words.withIndex()) {
            if (word in commaBeforeWords && index > 0) {
                val position = words.subList(0, index).joinToString(" ").length
                if (position > 0) {
                    val charBefore = text.getOrNull(position - 1)
                    if (charBefore != ',') {
                        suggestions.add(PunctuationSuggestion(
                            position = position,
                            issue = "Возможно, нужна запятая перед «$word»",
                            suggestion = "Добавить запятую"
                        ))
                    }
                }
            }
        }
        
        return suggestions
    }
    
    /**
     * Check for missing commas after introductory words
     */
    private fun checkMissingCommasAfterIntroductoryWords(text: String): List<PunctuationSuggestion> {
        val suggestions = mutableListOf<PunctuationSuggestion>()
        
        for (word in commaAfterWords) {
            if (text.lowercase().startsWith("$word ")) {
                val afterWord = word.length
                if (afterWord < text.length && text[afterWord] != ',') {
                    suggestions.add(PunctuationSuggestion(
                        position = word.length,
                        issue = "Вводное слово «$word» обычно выделяется запятой",
                        suggestion = "Добавить запятую после «$word»"
                    ))
                }
            }
        }
        
        return suggestions
    }
    
    /**
     * Check for spacing issues
     */
    private fun checkSpacingIssues(text: String): List<PunctuationSuggestion> {
        val suggestions = mutableListOf<PunctuationSuggestion>()
        
        // Check for missing space after punctuation
        val pattern = "([,;:.!?])([а-яёА-ЯЁ])".toRegex()
        pattern.findAll(text).forEach { match ->
            suggestions.add(PunctuationSuggestion(
                position = match.range.first + 1,
                issue = "Пропущен пробел после знака препинания",
                suggestion = "Добавить пробел"
            ))
        }
        
        return suggestions
    }
    
    /**
     * Check for quote issues
     */
    private fun checkQuoteIssues(text: String): List<PunctuationSuggestion> {
        val suggestions = mutableListOf<PunctuationSuggestion>()
        
        if (text.contains("\"")) {
            suggestions.add(PunctuationSuggestion(
                position = 0,
                issue = "В русском тексте рекомендуется использовать кавычки-ёлочки « »",
                suggestion = "Заменить кавычки на «ёлочки»"
            ))
        }
        
        return suggestions
    }
}

/**
 * Represents a punctuation suggestion
 */
data class PunctuationSuggestion(
    val position: Int,
    val issue: String,
    val suggestion: String
)
