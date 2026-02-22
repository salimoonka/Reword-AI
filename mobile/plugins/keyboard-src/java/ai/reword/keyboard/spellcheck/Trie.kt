/**
 * Trie data structure for efficient word lookup and prefix search
 * Optimized for Russian language with cyrillic character support
 */

package ai.reword.keyboard.spellcheck

class Trie {
    
    private val root = TrieNode()
    
    /**
     * Insert a word into the trie
     */
    fun insert(word: String) {
        var current = root
        for (char in word.lowercase()) {
            current = current.children.getOrPut(char) { TrieNode() }
        }
        current.isEndOfWord = true
        current.word = word.lowercase()
    }
    
    /**
     * Check if word exists in trie
     */
    fun search(word: String): Boolean {
        val node = findNode(word.lowercase())
        return node?.isEndOfWord == true
    }
    
    /**
     * Check if any word starts with prefix
     */
    fun startsWith(prefix: String): Boolean {
        return findNode(prefix.lowercase()) != null
    }
    
    /**
     * Get all words with given prefix
     */
    fun getWordsWithPrefix(prefix: String, limit: Int = 10): List<String> {
        val node = findNode(prefix.lowercase()) ?: return emptyList()
        val results = mutableListOf<String>()
        collectWords(node, results, limit)
        return results
    }
    
    /**
     * Get autocomplete suggestions for prefix
     * Sorted by word length (shorter first)
     */
    fun getSuggestions(prefix: String, limit: Int = 5): List<String> {
        val words = getWordsWithPrefix(prefix, limit * 2)
        return words.sortedBy { it.length }.take(limit)
    }
    
    /**
     * Find node for given prefix
     */
    private fun findNode(prefix: String): TrieNode? {
        var current = root
        for (char in prefix) {
            current = current.children[char] ?: return null
        }
        return current
    }
    
    /**
     * Collect all words under a node using DFS
     */
    private fun collectWords(node: TrieNode, results: MutableList<String>, limit: Int) {
        if (results.size >= limit) return
        
        if (node.isEndOfWord && node.word != null) {
            results.add(node.word!!)
        }
        
        // Sort children by char for deterministic order
        for ((_, child) in node.children.toSortedMap()) {
            if (results.size >= limit) break
            collectWords(child, results, limit)
        }
    }
    
    /**
     * Get word count in trie
     */
    fun wordCount(): Int {
        return countWords(root)
    }
    
    private fun countWords(node: TrieNode): Int {
        var count = if (node.isEndOfWord) 1 else 0
        for ((_, child) in node.children) {
            count += countWords(child)
        }
        return count
    }
    
    /**
     * Clear all words from trie
     */
    fun clear() {
        root.children.clear()
    }
    
    /**
     * Check if trie is empty
     */
    fun isEmpty(): Boolean = root.children.isEmpty()
    
    /**
     * Delete a word from trie
     */
    fun delete(word: String): Boolean {
        return deleteHelper(root, word.lowercase(), 0)
    }
    
    private fun deleteHelper(node: TrieNode, word: String, index: Int): Boolean {
        if (index == word.length) {
            if (!node.isEndOfWord) return false
            node.isEndOfWord = false
            node.word = null
            return node.children.isEmpty()
        }
        
        val char = word[index]
        val child = node.children[char] ?: return false
        
        val shouldDeleteChild = deleteHelper(child, word, index + 1)
        
        if (shouldDeleteChild) {
            node.children.remove(char)
            return node.children.isEmpty() && !node.isEndOfWord
        }
        
        return false
    }
    
    /**
     * Fuzzy search - find words within edit distance
     */
    fun fuzzySearch(word: String, maxDistance: Int = 2): List<String> {
        val results = mutableListOf<String>()
        fuzzySearchHelper(root, word.lowercase(), "", maxDistance, results)
        return results.distinct().sortedBy { 
            levenshteinDistance(it, word.lowercase()) 
        }
    }
    
    private fun fuzzySearchHelper(
        node: TrieNode,
        target: String,
        current: String,
        maxDistance: Int,
        results: MutableList<String>
    ) {
        if (results.size >= 20) return // Limit results
        
        if (node.isEndOfWord && node.word != null) {
            val distance = levenshteinDistance(current, target)
            if (distance <= maxDistance) {
                results.add(node.word!!)
            }
        }
        
        // Prune branches that are too far
        if (current.length > target.length + maxDistance) return
        
        for ((char, child) in node.children) {
            fuzzySearchHelper(child, target, current + char, maxDistance, results)
        }
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
}

/**
 * Trie node class
 */
private class TrieNode {
    val children = mutableMapOf<Char, TrieNode>()
    var isEndOfWord = false
    var word: String? = null
}
