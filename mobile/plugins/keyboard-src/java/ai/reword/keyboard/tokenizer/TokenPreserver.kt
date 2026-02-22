/**
 * TokenPreserver - Identifies and preserves English tokens in Russian text
 * Handles brand names, technical terms, and English phrases that shouldn't be paraphrased
 */

package ai.reword.keyboard.tokenizer

/**
 * Token type enumeration
 */
enum class TokenType {
    RUSSIAN,
    ENGLISH,
    NUMBER,
    PUNCTUATION,
    WHITESPACE,
    URL,
    EMAIL,
    HASHTAG,
    MENTION,
    EMOJI,
    MIXED
}

/**
 * Represents a text token
 */
data class Token(
    val text: String,
    val type: TokenType,
    val startIndex: Int,
    val endIndex: Int,
    val shouldPreserve: Boolean
)

/**
 * Token preservation engine
 */
object TokenPreserver {
    
    // Regex patterns
    private val cyrillicPattern = "[а-яёА-ЯЁ]+".toRegex()
    private val latinPattern = "[a-zA-Z]+".toRegex()
    private val numberPattern = "[0-9]+([.,][0-9]+)?".toRegex()
    private val urlPattern = "https?://[^\\s]+".toRegex()
    private val emailPattern = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}".toRegex()
    private val hashtagPattern = "#[a-zA-Zа-яёА-ЯЁ0-9_]+".toRegex()
    private val mentionPattern = "@[a-zA-Z0-9_]+".toRegex()
    private val emojiPattern = "[\\p{So}\\p{Cs}]+".toRegex()
    
    /**
     * Common English words that should always be preserved
     */
    private val preserveWords = setOf(
        // Tech terms
        "api", "sdk", "ui", "ux", "url", "http", "https", "json", "xml", "html", "css",
        "javascript", "typescript", "python", "swift", "kotlin", "java", "react", "vue",
        "angular", "node", "npm", "git", "github", "docker", "kubernetes", "aws", "azure",
        "google", "cloud", "database", "server", "client", "frontend", "backend", "fullstack",
        "devops", "agile", "scrum", "sprint", "kanban", "deploy", "release", "build",
        "debug", "test", "unit", "integration", "e2e", "ci", "cd", "pipeline",
        
        // Business terms
        "startup", "b2b", "b2c", "saas", "paas", "iaas", "kpi", "roi", "crm", "erp",
        "mvp", "poc", "roadmap", "backlog", "stakeholder", "deadline", "milestone",
        
        // Brands and products
        "iphone", "ipad", "macbook", "android", "windows", "linux", "macos", "ios",
        "chrome", "firefox", "safari", "edge", "telegram", "whatsapp", "instagram",
        "facebook", "twitter", "linkedin", "youtube", "tiktok", "spotify", "netflix",
        "uber", "airbnb", "amazon", "apple", "microsoft", "meta", "openai", "chatgpt",
        
        // Common English words often used in Russian
        "ok", "okay", "cool", "nice", "sorry", "please", "thanks", "thank you",
        "hello", "hi", "bye", "yes", "no", "maybe", "wow", "oops", "lol", "btw",
        "asap", "fyi", "diy", "wifi", "bluetooth", "usb", "hdmi", "led", "lcd",
        
        // Marketing/design
        "brand", "logo", "design", "style", "creative", "content", "marketing",
        "seo", "smm", "pr", "target", "audience", "engagement", "conversion",
        "funnel", "landing", "page", "banner", "newsletter", "email", "campaign"
    )
    
    /**
     * Tokenize text and identify tokens to preserve
     */
    fun tokenize(text: String): List<Token> {
        val tokens = mutableListOf<Token>()
        var currentIndex = 0
        
        while (currentIndex < text.length) {
            val remaining = text.substring(currentIndex)
            val token = extractToken(remaining, currentIndex)
            
            if (token != null) {
                tokens.add(token)
                currentIndex = token.endIndex
            } else {
                // Single character token
                val char = text[currentIndex]
                val type = if (char.isWhitespace()) TokenType.WHITESPACE else TokenType.PUNCTUATION
                tokens.add(Token(
                    text = char.toString(),
                    type = type,
                    startIndex = currentIndex,
                    endIndex = currentIndex + 1,
                    shouldPreserve = false
                ))
                currentIndex++
            }
        }
        
        return tokens
    }
    
    /**
     * Mark English tokens that should be preserved during paraphrase
     */
    fun markPreservationTokens(text: String): String {
        val tokens = tokenize(text)
        val result = StringBuilder()
        
        for (token in tokens) {
            if (token.shouldPreserve) {
                result.append("⟨preserve⟩${token.text}⟨/preserve⟩")
            } else {
                result.append(token.text)
            }
        }
        
        return result.toString()
    }
    
    /**
     * Extract preserved text after paraphrase (remove markers)
     */
    fun restorePreservedTokens(text: String): String {
        return text
            .replace("⟨preserve⟩", "")
            .replace("⟨/preserve⟩", "")
    }
    
    /**
     * Check if word should be preserved
     */
    fun shouldPreserve(word: String): Boolean {
        val lowercased = word.lowercase()
        
        // Check explicit preserve list
        if (lowercased in preserveWords) {
            return true
        }
        
        // Check if it's a URL, email, etc.
        if (isURL(word) || isEmail(word) || isHashtag(word) || isMention(word)) {
            return true
        }
        
        // Check if it's purely Latin characters (English word)
        if (word.matches("[a-zA-Z]+".toRegex())) {
            return true
        }
        
        // Check if it contains mixed scripts
        val hasCyrillic = cyrillicPattern.containsMatchIn(word)
        val hasLatin = latinPattern.containsMatchIn(word)
        
        if (hasLatin && !hasCyrillic) {
            return true
        }
        
        return false
    }
    
    /**
     * Get list of English tokens in text
     */
    fun getEnglishTokens(text: String): List<String> {
        return tokenize(text)
            .filter { it.type == TokenType.ENGLISH || it.shouldPreserve }
            .map { it.text }
    }
    
    /**
     * Extract token from text at given position
     */
    private fun extractToken(text: String, globalOffset: Int): Token? {
        // Try to match patterns in order of priority
        
        // URLs
        urlPattern.find(text)?.takeIf { it.range.first == 0 }?.let { match ->
            return Token(
                text = match.value,
                type = TokenType.URL,
                startIndex = globalOffset,
                endIndex = globalOffset + match.value.length,
                shouldPreserve = true
            )
        }
        
        // Emails
        emailPattern.find(text)?.takeIf { it.range.first == 0 }?.let { match ->
            return Token(
                text = match.value,
                type = TokenType.EMAIL,
                startIndex = globalOffset,
                endIndex = globalOffset + match.value.length,
                shouldPreserve = true
            )
        }
        
        // Hashtags
        hashtagPattern.find(text)?.takeIf { it.range.first == 0 }?.let { match ->
            return Token(
                text = match.value,
                type = TokenType.HASHTAG,
                startIndex = globalOffset,
                endIndex = globalOffset + match.value.length,
                shouldPreserve = true
            )
        }
        
        // Mentions
        mentionPattern.find(text)?.takeIf { it.range.first == 0 }?.let { match ->
            return Token(
                text = match.value,
                type = TokenType.MENTION,
                startIndex = globalOffset,
                endIndex = globalOffset + match.value.length,
                shouldPreserve = true
            )
        }
        
        // Numbers
        numberPattern.find(text)?.takeIf { it.range.first == 0 }?.let { match ->
            return Token(
                text = match.value,
                type = TokenType.NUMBER,
                startIndex = globalOffset,
                endIndex = globalOffset + match.value.length,
                shouldPreserve = true
            )
        }
        
        // Cyrillic words
        cyrillicPattern.find(text)?.takeIf { it.range.first == 0 }?.let { match ->
            return Token(
                text = match.value,
                type = TokenType.RUSSIAN,
                startIndex = globalOffset,
                endIndex = globalOffset + match.value.length,
                shouldPreserve = false
            )
        }
        
        // Latin words
        latinPattern.find(text)?.takeIf { it.range.first == 0 }?.let { match ->
            val shouldPreserve = shouldPreserve(match.value)
            return Token(
                text = match.value,
                type = TokenType.ENGLISH,
                startIndex = globalOffset,
                endIndex = globalOffset + match.value.length,
                shouldPreserve = shouldPreserve
            )
        }
        
        // Emojis
        emojiPattern.find(text)?.takeIf { it.range.first == 0 }?.let { match ->
            return Token(
                text = match.value,
                type = TokenType.EMOJI,
                startIndex = globalOffset,
                endIndex = globalOffset + match.value.length,
                shouldPreserve = true
            )
        }
        
        return null
    }
    
    private fun isURL(text: String): Boolean = urlPattern.matches(text)
    private fun isEmail(text: String): Boolean = emailPattern.matches(text)
    private fun isHashtag(text: String): Boolean = hashtagPattern.matches(text)
    private fun isMention(text: String): Boolean = mentionPattern.matches(text)
}
