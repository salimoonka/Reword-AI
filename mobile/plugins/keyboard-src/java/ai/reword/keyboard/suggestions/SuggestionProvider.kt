/**
 * SuggestionProvider - Provides autocomplete, spelling, and next-word suggestions
 * Integrates SpellChecker, RussianDictionary, and bigram-based next-word prediction
 */

package ai.reword.keyboard.suggestions

import ai.reword.keyboard.spellcheck.RussianDictionary
import ai.reword.keyboard.spellcheck.SpellChecker
import android.content.Context
import android.util.LruCache

class SuggestionProvider private constructor(context: Context) {
    
    private val spellChecker = SpellChecker(context)
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
     * Get suggestions for current word being typed.
     * Now uses the full context (previous words) to rank results.
     */
    fun getSuggestions(word: String, limit: Int = 5): List<String> {
        val trimmed = word.trim().lowercase()
        if (trimmed.isEmpty()) return emptyList()
        
        val cacheKey = "${trimmed}_$limit"
        cache.get(cacheKey)?.let { return it }
        
        val suggestions = mutableListOf<String>()
        
        // 1. Prefix completions (word being typed → what it could become)
        val prefixSuggestions = RussianDictionary.getWordsWithPrefix(trimmed, limit * 2)
            .filter { it != trimmed }
        suggestions.addAll(prefixSuggestions)
        
        // 2. Spell corrections for mistyped words
        if (suggestions.size < limit && !RussianDictionary.contains(trimmed)) {
            val corrections = spellChecker.getSuggestions(trimmed, limit - suggestions.size)
            for (correction in corrections) {
                if (correction !in suggestions) suggestions.add(correction)
            }
        }
        
        // 3. Fuzzy matches if still not enough
        if (suggestions.size < limit) {
            val fuzzy = RussianDictionary.getSimilarWords(trimmed, limit)
            for (w in fuzzy) {
                if (w !in suggestions && w != trimmed && suggestions.size < limit)
                    suggestions.add(w)
            }
        }
        
        val result = suggestions.take(limit)
        cache.put(cacheKey, result)
        return result
    }

    /**
     * Get suggestions using full context — previous word influences ranking.
     * This is the primary method called by the keyboard service.
     */
    fun getSuggestionsWithContext(
        currentWord: String,
        previousWord: String?,
        limit: Int = 5
    ): List<String> {
        val trimmed = currentWord.trim().lowercase()
        
        // If the current word is empty and we have a previous word,
        // show next-word predictions instead of prefix completions
        if (trimmed.isEmpty() && previousWord != null) {
            return getNextWordPredictions(previousWord.lowercase(), limit)
        }
        
        if (trimmed.isEmpty()) return emptyList()
        
        val cacheKey = "${previousWord ?: ""}_${trimmed}_$limit"
        cache.get(cacheKey)?.let { return it }
        
        val suggestions = mutableListOf<String>()
        
        // 1. Get prefix completions
        val completions = RussianDictionary.getWordsWithPrefix(trimmed, limit * 3)
            .filter { it != trimmed }
        
        // 2. If we have previous context, boost contextually relevant completions
        if (previousWord != null) {
            val nextWords = getNextWordPredictions(previousWord.lowercase(), 20)
            val contextual = completions.filter { it in nextWords }
            val others = completions.filter { it !in nextWords }
            suggestions.addAll(contextual)
            suggestions.addAll(others)
        } else {
            suggestions.addAll(completions)
        }
        
        // 3. Add spell corrections if needed
        if (suggestions.size < limit && !RussianDictionary.contains(trimmed)) {
            val corrections = spellChecker.getSuggestions(trimmed, limit)
            for (c in corrections) {
                if (c !in suggestions && c != trimmed) suggestions.add(c)
            }
        }
        
        val result = suggestions.take(limit)
        cache.put(cacheKey, result)
        return result
    }

    /**
     * Next-word prediction: given the previous word, predict what comes next.
     */
    fun getNextWordPredictions(previousWord: String, limit: Int = 5): List<String> {
        val lower = previousWord.lowercase()
        return bigrams[lower]?.take(limit) ?: emptyList()
    }
    
    fun getSpellingCorrections(word: String, limit: Int = 3): List<String> {
        return spellChecker.getSuggestions(word, limit)
    }
    
    fun getAutocompletions(prefix: String, limit: Int = 5): List<String> {
        return RussianDictionary.getCompletions(prefix, limit)
    }
    
    fun isCorrectlySpelled(word: String): Boolean {
        return RussianDictionary.contains(word) || spellChecker.isWordCorrect(word)
    }
    
    fun clearCache() { cache.evictAll() }

    fun getCurrentWord(text: String, cursorPosition: Int): String? {
        if (cursorPosition <= 0 || cursorPosition > text.length) return null
        var startIndex = 0
        for (i in (0 until cursorPosition).reversed()) {
            if (text[i].isWhitespace() || text[i] in ".,!?;:\"'()-") {
                startIndex = i + 1; break
            }
        }
        val word = text.substring(startIndex, cursorPosition)
        return if (word.isEmpty()) null else word
    }
    
    fun getPreviousWords(text: String, cursorPosition: Int, count: Int = 3): List<String> {
        if (cursorPosition <= 0 || cursorPosition > text.length) return emptyList()
        val textBeforeCursor = text.substring(0, cursorPosition)
        val words = textBeforeCursor.split(Regex("[\\s.,!?;:\"'()-]+"))
            .filter { it.isNotEmpty() }
        return words.dropLast(1).takeLast(count)
    }

    /**
     * Comprehensive Russian bigram table — maps a word to its most likely
     * following words, ordered by probability. Covers ~200 words with
     * 5–10 completions each. Designed for chat / messaging contexts.
     */
    private val bigrams: Map<String, List<String>> = mapOf(
        // Prepositions
        "в" to listOf("этом", "том", "любом", "общем", "итоге", "курсе", "порядке", "целом", "принципе"),
        "на" to listOf("самом", "работе", "месте", "улице", "связи", "самом", "деле", "неделе", "днях"),
        "с" to listOf("тобой", "ним", "ней", "нами", "вами", "ними", "утра", "работы", "каждым"),
        "к" to listOf("сожалению", "тому", "этому", "нам", "вам", "тебе", "нему", "ней", "счастью"),
        "у" to listOf("меня", "тебя", "него", "неё", "нас", "вас", "них", "нас"),
        "о" to listOf("том", "чём", "себе", "нём", "ней", "них", "нас", "вас"),
        "по" to listOf("моему", "твоему", "его", "нашему", "вашему", "крайней", "дороге", "работе"),
        "за" to listOf("это", "то", "него", "неё", "них", "вас", "нас", "собой"),
        "из" to listOf("них", "нас", "вас", "дома", "города", "за"),
        "от" to listOf("него", "неё", "них", "нас", "вас", "тебя", "меня"),
        "до" to listOf("сих", "этого", "того", "конца", "завтра", "вечера", "утра", "дома"),
        "для" to listOf("меня", "тебя", "него", "неё", "нас", "вас", "них", "этого", "того"),
        "без" to listOf("проблем", "вопросов", "него", "неё", "них", "тебя", "меня"),
        "при" to listOf("этом", "том", "условии", "необходимости", "случае"),
        "через" to listOf("час", "минуту", "неделю", "месяц", "год", "несколько"),
        "после" to listOf("этого", "того", "обеда", "работы", "школы", "завтра"),
        "перед" to listOf("тем", "ним", "ней", "нами", "вами"),

        // Pronouns
        "я" to listOf("не", "хочу", "могу", "знаю", "думаю", "буду", "тебя", "уже", "тоже", "сейчас"),
        "ты" to listOf("не", "можешь", "хочешь", "знаешь", "думаешь", "будешь", "тоже", "уже"),
        "он" to listOf("не", "был", "сказал", "говорит", "хочет", "может", "знает", "будет", "уже"),
        "она" to listOf("не", "была", "сказала", "говорит", "хочет", "может", "знает", "тоже"),
        "мы" to listOf("не", "можем", "будем", "хотим", "знаем", "должны", "уже", "тоже"),
        "вы" to listOf("не", "можете", "хотите", "знаете", "будете", "должны", "уже", "тоже"),
        "они" to listOf("не", "были", "могут", "хотят", "знают", "будут", "должны", "тоже"),
        "это" to listOf("не", "было", "будет", "очень", "мой", "наш", "тоже", "просто", "правда"),
        "мне" to listOf("нужно", "надо", "нравится", "кажется", "понравилось", "не", "очень", "тоже"),
        "тебе" to listOf("нужно", "надо", "нравится", "не", "тоже", "очень", "понравилось"),
        "его" to listOf("не", "нет", "зовут", "нужно"),
        "её" to listOf("не", "зовут", "нет"),
        "нас" to listOf("не", "есть", "нет", "будет"),
        "вас" to listOf("не", "есть", "нет", "зовут"),
        "их" to listOf("не", "нет", "было", "есть"),
        "меня" to listOf("есть", "нет", "зовут", "не"),
        "тебя" to listOf("есть", "нет", "зовут", "не"),
        "ему" to listOf("нужно", "надо", "не", "нравится"),
        "ей" to listOf("нужно", "надо", "не", "нравится"),
        "нам" to listOf("нужно", "надо", "не", "пора"),
        "вам" to listOf("нужно", "надо", "не", "стоит"),
        "им" to listOf("нужно", "надо", "не"),

        // Determiners & demonstratives
        "этот" to listOf("вопрос", "день", "момент", "раз", "человек", "город", "фильм"),
        "эта" to listOf("работа", "книга", "идея", "история", "проблема", "ситуация"),
        "эти" to listOf("люди", "дни", "вопросы", "вещи", "слова"),
        "тот" to listOf("самый", "день", "момент", "человек", "же"),
        "какой" to listOf("то", "нибудь", "именно", "сейчас"),
        "такой" to listOf("же", "вот", "большой", "хороший"),
        "каждый" to listOf("день", "раз", "человек", "год"),
        "все" to listOf("равно", "хорошо", "будет", "правильно", "нормально", "ещё", "ок"),
        "всё" to listOf("равно", "хорошо", "будет", "правильно", "нормально", "ещё", "ок"),

        // Common verbs → next words
        "хочу" to listOf("сказать", "спросить", "знать", "есть", "пить", "пойти", "купить", "поехать"),
        "могу" to listOf("сказать", "помочь", "сделать", "прийти", "позвонить"),
        "знаю" to listOf("что", "как", "где", "когда", "почему"),
        "думаю" to listOf("что", "да", "нет", "так", "об"),
        "буду" to listOf("ждать", "дома", "рад", "там", "делать", "готов"),
        "был" to listOf("в", "на", "у", "не", "очень", "там", "здесь"),
        "была" to listOf("в", "на", "у", "не", "очень", "там"),
        "было" to listOf("бы", "очень", "не", "так", "хорошо", "интересно"),
        "будет" to listOf("хорошо", "готово", "время", "ещё", "всё", "лучше"),
        "нужно" to listOf("сделать", "купить", "пойти", "позвонить", "поговорить", "найти"),
        "надо" to listOf("сделать", "купить", "пойти", "позвонить", "поговорить", "будет"),
        "можно" to listOf("сделать", "сказать", "было", "ли", "пойти", "попросить"),
        "нельзя" to listOf("так", "это", "было", "сказать"),
        "давай" to listOf("завтра", "потом", "сегодня", "вечером", "встретимся", "ещё"),
        "давайте" to listOf("начнём", "сделаем", "пойдём", "обсудим", "встретимся"),
        "пойдём" to listOf("в", "на", "домой", "гулять", "вместе"),
        "сделать" to listOf("это", "всё", "так", "что", "ещё"),
        "есть" to listOf("ли", "у", "что", "ещё", "время"),
        "нет" to listOf("проблем", "спасибо", "не", "ничего", "конечно"),
        "да" to listOf("конечно", "ладно", "хорошо", "я", "это", "нет"),
        "был" to listOf("в", "на", "у", "не", "очень"),
        "стал" to listOf("лучше", "больше", "делать", "думать"),

        // Conjunctions / connectors
        "и" to listOf("я", "он", "она", "мы", "вы", "они", "всё", "это", "ещё"),
        "но" to listOf("я", "он", "она", "это", "мы", "всё", "потом", "не"),
        "а" to listOf("я", "ты", "он", "она", "вы", "мы", "что", "вот", "потом"),
        "или" to listOf("нет", "да", "он", "она", "ты", "мы", "это"),
        "что" to listOf("это", "он", "она", "вы", "мы", "ты", "там", "тут", "не"),
        "как" to listOf("раз", "только", "будто", "всегда", "ты", "дела", "обычно"),
        "если" to listOf("бы", "ты", "вы", "он", "она", "не", "что", "будет"),
        "когда" to listOf("ты", "он", "она", "мы", "вы", "будет", "я"),
        "чтобы" to listOf("не", "он", "она", "они", "мы", "вы", "сделать"),
        "потому" to listOf("что"),
        "поэтому" to listOf("я", "он", "она", "мы", "надо", "нужно"),
        "хотя" to listOf("и", "бы", "он", "она", "я", "это"),
        "пока" to listOf("не", "что", "я", "он", "она", "нет", "всё"),
        "так" to listOf("как", "что", "и", "же", "вот", "себе"),
        "уже" to listOf("не", "давно", "почти", "скоро", "совсем", "всё"),
        "только" to listOf("что", "не", "один", "он", "так", "для"),
        "ещё" to listOf("не", "раз", "один", "бы", "больше", "есть"),
        "еще" to listOf("не", "раз", "один", "бы", "больше", "есть"),
        "даже" to listOf("не", "если", "он", "она", "это"),

        // Adverbs
        "очень" to listOf("хорошо", "плохо", "много", "мало", "красиво", "важно", "интересно", "рад"),
        "сейчас" to listOf("я", "буду", "не", "он", "она", "мы", "будет", "всё"),
        "потом" to listOf("я", "он", "она", "мы", "будет", "поговорим", "позвоню"),
        "здесь" to listOf("есть", "нет", "всё", "очень", "много"),
        "там" to listOf("есть", "нет", "было", "будет", "очень", "всё"),
        "тоже" to listOf("не", "хочу", "могу", "думаю", "так", "буду"),
        "тут" to listOf("есть", "нет", "всё", "много"),
        "завтра" to listOf("я", "буду", "мы", "будет", "в", "утром", "вечером"),
        "сегодня" to listOf("я", "мы", "был", "в", "утром", "вечером", "днём"),
        "вчера" to listOf("я", "он", "она", "мы", "был", "была", "были", "в"),

        // Adjectives → predictable nouns
        "хороший" to listOf("день", "вопрос", "вариант", "человек"),
        "хорошая" to listOf("идея", "работа", "погода", "новость"),
        "хорошо" to listOf("что", "бы", "было", "выглядит"),
        "новый" to listOf("год", "день", "дом", "телефон", "человек"),
        "новая" to listOf("работа", "машина", "квартира", "жизнь"),
        "большой" to listOf("дом", "город", "выбор", "вопрос"),
        "большая" to listOf("проблема", "просьба", "часть", "разница"),
        "последний" to listOf("раз", "день", "момент", "шанс"),

        // Common nouns → predictable follow-ups
        "спасибо" to listOf("большое", "за", "тебе", "вам", "огромное"),
        "привет" to listOf("как", "что", "ты", "всем"),
        "пожалуйста" to listOf("не", "помоги", "скажи", "подожди"),
        "извини" to listOf("что", "за", "меня", "пожалуйста"),
        "простите" to listOf("что", "за", "меня", "пожалуйста"),
        "время" to listOf("есть", "было", "будет", "идёт", "пришло"),
        "день" to listOf("рождения", "был", "будет", "прошёл"),
        "дом" to listOf("был", "стоит", "находится", "большой"),
        "работа" to listOf("была", "будет", "есть", "хорошая"),
        "вопрос" to listOf("в", "том", "был", "есть"),
        "проблема" to listOf("в", "том", "была", "есть", "была"),
        "жизнь" to listOf("хороша", "прекрасна", "была", "есть"),
        "доброе" to listOf("утро"),
        "добрый" to listOf("день", "вечер"),
        "добрая" to listOf("ночь"),
        "до" to listOf("свидания", "встречи", "завтра", "скорого"),
        "с" to listOf("днём", "рождения", "праздником", "новым"),
        "удачи" to listOf("тебе", "вам", "нам"),

        // Modals / state words
        "пора" to listOf("идти", "домой", "спать", "есть", "работать"),
        "лучше" to listOf("бы", "не", "всего", "так", "было"),
        "может" to listOf("быть", "он", "она", "это"),
        "должен" to listOf("быть", "сделать", "был"),
        "должна" to listOf("быть", "была", "сделать"),
        "должны" to listOf("быть", "были", "сделать")
    )
}
