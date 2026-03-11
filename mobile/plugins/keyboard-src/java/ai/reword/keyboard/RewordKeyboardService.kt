/**
 * RewordKeyboardService – Android InputMethodService
 *
 * Features:
 *  - Enter ALWAYS inserts "\n" in multi-line fields; only performs
 *    IME action for single-line fields with explicit actions.
 *  - Globe toggles RU ↔ EN inside our keyboard (no system switch).
 *  - Dedicated callbacks for delete / enter / space (no magic strings).
 *  - AI menu overlay + instant check button wired up.
 *  - Long-press delete with accelerating repeat (Gboard-style).
 *  - Optimized key input for fast typing.
 */

package ai.reword.keyboard

import android.inputmethodservice.InputMethodService
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import ai.reword.keyboard.views.KeyboardView
import ai.reword.keyboard.views.PreviewPanelView
import ai.reword.keyboard.views.SuggestionStripListener
import ai.reword.keyboard.api.APIService
import ai.reword.keyboard.models.ParaphraseResult
import ai.reword.keyboard.models.ParaphraseMode
import ai.reword.keyboard.suggestions.SuggestionProvider
import kotlinx.coroutines.*

class RewordKeyboardService :
    InputMethodService(),
    KeyboardView.KeyboardListener,
    SuggestionStripListener {

    private lateinit var keyboardView: KeyboardView
    private var previewPanel: PreviewPanelView? = null

    private var currentMode: ParaphraseMode = ParaphraseMode.PROFESSIONAL
    private var isLoading = false

    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val apiService by lazy { APIService(applicationContext) }
    private val suggestionProvider by lazy { SuggestionProvider.getInstance(applicationContext) }
    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false

    /* ═══════ Long-press delete repeat ═══════════════════════ */
    private val deleteHandler = Handler(Looper.getMainLooper())
    private var deleteRepeatDelay = INITIAL_DELETE_DELAY
    private var isDeleteRepeating = false
    private val deleteRunnable = object : Runnable {
        override fun run() {
            if (!isDeleteRepeating) return
            performSingleDelete()
            // Accelerate: reduce delay to min, capped at fast rate
            deleteRepeatDelay = (deleteRepeatDelay * ACCELERATION_FACTOR).toLong()
                .coerceAtLeast(MIN_DELETE_DELAY)
            deleteHandler.postDelayed(this, deleteRepeatDelay)
        }
    }

    companion object {
        private const val INITIAL_DELETE_DELAY = 400L    // ms before first repeat
        private const val MIN_DELETE_DELAY = 30L         // fastest repeat rate
        private const val ACCELERATION_FACTOR = 0.85     // speed-up per repeat
    }

    /* ═══════ Lifecycle ═══════════════════════════════════════ */

    override fun onCreateInputView(): View {
        /* Restore persisted mode */
        val savedMode = applicationContext.getSharedPreferences("reword_shared_prefs", MODE_PRIVATE)
            .getString("selected_mode", null)
        if (savedMode != null) {
            try { currentMode = ParaphraseMode.valueOf(savedMode) } catch (_: Exception) {}
        }

        keyboardView = KeyboardView(this).apply {
            listener = this@RewordKeyboardService
            setMode(currentMode)
        }

        // Style the IME navigation bar to match keyboard theme
        applyNavigationBarTheme(keyboardView.isDarkTheme)

        return keyboardView
    }

    override fun onStartInput(attr: EditorInfo?, restarting: Boolean) {
        super.onStartInput(attr, restarting)
        if (::keyboardView.isInitialized) {
            keyboardView.updateReturnKeyType(attr?.imeOptions ?: EditorInfo.IME_ACTION_NONE)
        }
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        if (::keyboardView.isInitialized) {
            /* Recreate keyboard view if theme changed since it was built */
            val currentIsDark = KeyboardView.detectDarkTheme(this)
            if (currentIsDark != keyboardView.isDarkTheme) {
                keyboardView = KeyboardView(this).apply {
                    listener = this@RewordKeyboardService
                    setMode(currentMode)
                }
                setInputView(keyboardView)
                applyNavigationBarTheme(currentIsDark)
            }
            keyboardView.reset()
        }
    }

    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(newConfig)
        if (::keyboardView.isInitialized) {
            val currentIsDark = KeyboardView.detectDarkTheme(this)
            if (currentIsDark != keyboardView.isDarkTheme) {
                keyboardView = KeyboardView(this).apply {
                    listener = this@RewordKeyboardService
                    setMode(currentMode)
                }
                setInputView(keyboardView)
                applyNavigationBarTheme(currentIsDark)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopDeleteRepeat()
        stopVoiceInput()
        speechRecognizer?.destroy()
        speechRecognizer = null
        serviceScope.cancel()
    }

    /* ═══════ KeyboardListener ═══════════════════════════════ */

    override fun onKeyPressed(key: String) {
        val ic = currentInputConnection ?: return

        // Handle special prefixed commands from overlay
        if (key.startsWith("MODE:")) {
            val name = key.removePrefix("MODE:")
            try {
                val mode = ParaphraseMode.valueOf(name)
                currentMode = mode
                keyboardView.setMode(mode)
                // Start paraphrase immediately after mode selection
                performParaphrase()
            } catch (_: Exception) {}
            return
        }

        // Use beginBatchEdit/endBatchEdit for faster text commitment
        ic.beginBatchEdit()
        ic.commitText(key, 1)
        ic.endBatchEdit()

        // Auto-unshift after typing a letter (unless caps-locked)
        if (keyboardView.isShifted && !keyboardView.isCapsLocked) {
            keyboardView.setShift(false)
        }

        performHaptic()
        updateSuggestionsDebounced()
    }

    override fun onDeletePressed() {
        performSingleDelete()
        performHaptic()
        updateSuggestionsDebounced()
    }

    override fun onDeleteLongPressStart() {
        // Start repeating delete with acceleration (Gboard-style)
        isDeleteRepeating = true
        deleteRepeatDelay = INITIAL_DELETE_DELAY
        deleteHandler.postDelayed(deleteRunnable, deleteRepeatDelay)
    }

    override fun onDeleteLongPressEnd() {
        stopDeleteRepeat()
    }

    private fun performSingleDelete() {
        val ic = currentInputConnection ?: return
        ic.beginBatchEdit()
        val sel = ic.getSelectedText(0)
        if (sel != null && sel.length > 0) {
            // Delete selection
            ic.commitText("", 1)
        } else {
            // Use BreakIterator to handle emoji/surrogate pairs correctly
            // (avoids showing "?" for half-deleted surrogate pairs)
            val before = ic.getTextBeforeCursor(16, 0)
            if (before != null && before.isNotEmpty()) {
                val bi = java.text.BreakIterator.getCharacterInstance()
                bi.setText(before.toString())
                val end = bi.last()
                val prev = bi.previous()
                val deleteCount = if (prev != java.text.BreakIterator.DONE) end - prev else 1
                ic.deleteSurroundingText(deleteCount, 0)
            } else {
                ic.deleteSurroundingText(1, 0)
            }
        }
        ic.endBatchEdit()
    }

    private fun stopDeleteRepeat() {
        isDeleteRepeating = false
        deleteHandler.removeCallbacks(deleteRunnable)
    }

    override fun onEnterPressed() {
        val ic = currentInputConnection ?: return
        val ei = currentInputEditorInfo

        // If the field is single-line and has a specific IME action
        // (Search, Go, Send, Done), honour it. Otherwise insert newline.
        val action = (ei?.imeOptions ?: 0) and EditorInfo.IME_MASK_ACTION
        val flagNoEnter = (ei?.imeOptions ?: 0) and EditorInfo.IME_FLAG_NO_ENTER_ACTION
        val isMultiLine = (ei?.inputType ?: 0) and
                android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE != 0

        if (!isMultiLine && flagNoEnter == 0 && action != EditorInfo.IME_ACTION_NONE
            && action != EditorInfo.IME_ACTION_UNSPECIFIED) {
            ic.performEditorAction(action)
        } else {
            // Default: insert newline
            ic.commitText("\n", 1)
        }
        performHaptic()
    }

    override fun onSpacePressed() {
        val ic = currentInputConnection ?: return
        ic.beginBatchEdit()
        ic.commitText(" ", 1)
        ic.endBatchEdit()
        performHaptic()
        updateSuggestionsDebounced()
    }

    override fun onShiftPressed() {
        keyboardView.toggleShift()
        performHaptic()
    }

    override fun onLanguageToggle() {
        keyboardView.toggleLanguage()
        performHaptic()
    }

    override fun onMenuPressed() {
        keyboardView.showAIMenu()
    }

    override fun onInstantCheckPressed() {
        // "Instant fix" — run grammar check and auto-replace
        performCheck()
    }

    override fun onSuggestionPicked(word: String) {
        val ic = currentInputConnection ?: return
        ic.beginBatchEdit()
        val before = ic.getTextBeforeCursor(50, 0)?.toString() ?: ""
        val cur = before.split(Regex("\\s+")).lastOrNull() ?: ""
        if (cur.isNotEmpty()) ic.deleteSurroundingText(cur.length, 0)
        ic.commitText("$word ", 1)
        ic.endBatchEdit()
        keyboardView.clearSuggestions()
    }

    override fun onVoiceInputPressed() {
        if (isListening) {
            stopVoiceInput()
            return
        }

        /* ── 1. Runtime permission check ── */
        if (android.content.pm.PackageManager.PERMISSION_GRANTED !=
            checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)) {
            android.widget.Toast.makeText(
                this, "Разрешите доступ к микрофону в настройках приложения",
                android.widget.Toast.LENGTH_LONG
            ).show()
            return
        }

        try {
            /* Always destroy previous — SpeechRecognizer is one-shot. */
            speechRecognizer?.destroy()
            speechRecognizer = null

            /* ── 2. Create recogniser ──────────────────────────────
               API 31+: prefer on-device recogniser (works offline).
               Otherwise: default cloud-based recogniser.
               Even if isRecognitionAvailable reports false (package-visibility
               issue on Android 11+), still TRY creating — many devices
               return false but work fine if <queries> is declared. */
            val sr: SpeechRecognizer = when {
                Build.VERSION.SDK_INT >= 31 -> try {
                    @Suppress("NewApi")
                    if (SpeechRecognizer.isOnDeviceRecognitionAvailable(this))
                        SpeechRecognizer.createOnDeviceSpeechRecognizer(this)
                    else
                        SpeechRecognizer.createSpeechRecognizer(this)
                } catch (_: Exception) {
                    SpeechRecognizer.createSpeechRecognizer(this)
                }
                else -> SpeechRecognizer.createSpeechRecognizer(this)
            }

            speechRecognizer = sr.also { rec ->
                rec.setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {
                        isListening = true
                        android.widget.Toast.makeText(
                            this@RewordKeyboardService, "Говорите...",
                            android.widget.Toast.LENGTH_SHORT
                        ).show()
                    }
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() { isListening = false }
                    override fun onError(error: Int) {
                        isListening = false
                        /* Remove any partial composing text */
                        currentInputConnection?.finishComposingText()
                        val msg = when (error) {
                            SpeechRecognizer.ERROR_NO_MATCH -> "Речь не распознана"
                            SpeechRecognizer.ERROR_AUDIO -> "Ошибка микрофона"
                            SpeechRecognizer.ERROR_NETWORK,
                            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Ошибка сети"
                            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ->
                                "Нет разрешения на микрофон"
                            SpeechRecognizer.ERROR_RECOGNIZER_BUSY ->
                                "Распознавание занято, попробуйте снова"
                            SpeechRecognizer.ERROR_CLIENT -> return  // silent — cancellation
                            SpeechRecognizer.ERROR_SERVER -> "Ошибка сервера распознавания"
                            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Время ожидания речи истекло"
                            else -> "Ошибка голосового ввода ($error)"
                        }
                        android.widget.Toast.makeText(
                            this@RewordKeyboardService, msg, android.widget.Toast.LENGTH_SHORT
                        ).show()
                        speechRecognizer?.destroy()
                        speechRecognizer = null
                    }
                    override fun onResults(results: Bundle?) {
                        isListening = false
                        val text = results
                            ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            ?.firstOrNull()
                        val ic = currentInputConnection
                        if (ic != null && !text.isNullOrBlank()) {
                            ic.beginBatchEdit()
                            ic.commitText(text, 1) // also replaces composing text
                            ic.endBatchEdit()
                        } else {
                            ic?.finishComposingText()
                        }
                        speechRecognizer?.destroy()
                        speechRecognizer = null
                    }
                    override fun onPartialResults(partialResults: Bundle?) {
                        val partial = partialResults
                            ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            ?.firstOrNull()
                        if (!partial.isNullOrBlank()) {
                            currentInputConnection?.setComposingText(partial, 1)
                        }
                    }
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            }

            val intent = android.content.Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE,
                    if (keyboardView.isEnglishLayout) "en-US" else "ru-RU")
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            }
            speechRecognizer?.startListening(intent)
        } catch (e: Exception) {
            isListening = false
            speechRecognizer?.destroy()
            speechRecognizer = null
            android.widget.Toast.makeText(
                this, "Голосовой ввод недоступен: ${e.message}",
                android.widget.Toast.LENGTH_LONG
            ).show()
        }
    }

    private fun stopVoiceInput() {
        try {
            speechRecognizer?.stopListening()
        } catch (_: Exception) {}
        isListening = false
    }

    /**
     * Set the IME window's navigation bar color and icon tint to match
     * the keyboard theme so the small system strip below the keyboard
     * (switch-keyboard icon, etc.) doesn't clash.
     */
    private fun applyNavigationBarTheme(isDark: Boolean) {
        val w = window?.window ?: return
        val navColor = if (isDark) 0xFF1C1C1E.toInt() else 0xFFD1D3D9.toInt()
        w.navigationBarColor = navColor
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val controller = w.insetsController
            if (isDark) {
                // Dark bg → light (white) navigation icons
                controller?.setSystemBarsAppearance(
                    0,
                    android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                )
            } else {
                // Light bg → dark navigation icons
                controller?.setSystemBarsAppearance(
                    android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                    android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                )
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            @Suppress("DEPRECATION")
            val flags = w.decorView.systemUiVisibility
            @Suppress("DEPRECATION")
            w.decorView.systemUiVisibility = if (isDark) {
                flags and View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
            } else {
                flags or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
            }
        }
    }

    /* SuggestionStripListener (legacy compat) */
    override fun onSuggestionSelected(suggestion: String) = onSuggestionPicked(suggestion)

    /* ═══════ Suggestions (debounced for fast typing) ═══════ */

    private val suggestionsHandler = Handler(Looper.getMainLooper())
    private val suggestionsRunnable = Runnable { updateSuggestions() }

    private fun updateSuggestionsDebounced() {
        suggestionsHandler.removeCallbacks(suggestionsRunnable)
        suggestionsHandler.postDelayed(suggestionsRunnable, 50)
    }

    private fun updateSuggestions() {
        val ic = currentInputConnection ?: return
        val before = ic.getTextBeforeCursor(100, 0)?.toString() ?: ""
        val words = before.split(Regex("\\s+")).filter { it.isNotEmpty() }
        val currentWord = words.lastOrNull() ?: ""
        val previousWord = if (words.size >= 2) words[words.size - 2] else null

        // After a space (current word is empty), show next-word predictions
        if (before.endsWith(" ") && previousWord != null) {
            val predictions = suggestionProvider.getNextWordPredictions(previousWord, 5)
            if (predictions.isNotEmpty()) {
                keyboardView.updateSuggestions(predictions)
                return
            }
        }

        if (currentWord.length >= 2) {
            val list = suggestionProvider.getSuggestionsWithContext(currentWord, previousWord, 5)
            keyboardView.updateSuggestions(list)
        } else if (currentWord.isEmpty() && previousWord != null) {
            val predictions = suggestionProvider.getNextWordPredictions(previousWord, 5)
            keyboardView.updateSuggestions(predictions)
        } else {
            keyboardView.clearSuggestions()
        }
    }

    /* ═══════ AI operations ══════════════════════════════════ */

    private fun performParaphrase() {
        if (isLoading) return
        val ic = currentInputConnection ?: return
        val text = getContextText(ic)
        if (text.isNullOrBlank()) {
            showToast("Введите текст для улучшения")
            return
        }

        isLoading = true
        keyboardView.setLoading(true)

        serviceScope.launch {
            try {
                val result = apiService.paraphrase(text, currentMode)
                if (result.outputText.isBlank()) {
                    showToast("Пустой ответ от сервера")
                } else {
                    showPreviewPanel(result)
                }
            } catch (e: Exception) {
                showToast(e.message ?: "Ошибка")
            } finally {
                isLoading = false
                keyboardView.setLoading(false)
            }
        }
    }

    private fun performCheck() {
        if (isLoading) return
        val ic = currentInputConnection ?: return
        val text = getContextText(ic)
        if (text.isNullOrBlank()) {
            showToast("Введите текст для проверки")
            return
        }

        isLoading = true
        keyboardView.setLoading(true)

        serviceScope.launch {
            try {
                val result = apiService.checkGrammar(text)
                // For instant check we auto-replace text immediately
                if (result.outputText != text) {
                    replaceText(ic, result.outputText)
                    showToast("Исправлено ✓")
                } else {
                    showToast("Ошибок не найдено")
                }
            } catch (e: Exception) {
                showToast(e.message ?: "Ошибка")
            } finally {
                isLoading = false
                keyboardView.setLoading(false)
            }
        }
    }

    /* ═══════ Preview Panel ══════════════════════════════════ */

    private fun showPreviewPanel(result: ParaphraseResult) {
        try {
            previewPanel = PreviewPanelView(this).apply {
                setResult(result)
                onConfirm = { text ->
                    currentInputConnection?.let { replaceText(it, text) }
                    hidePreviewPanel()
                }
                onCancel = { hidePreviewPanel() }
                onCopy = { text -> copyToClipboard(text) }
            }
            setInputView(previewPanel)
        } catch (e: Exception) {
            showToast("Ошибка отображения: ${e.message}")
            hidePreviewPanel()
        }
    }

    private fun hidePreviewPanel() {
        previewPanel = null
        setInputView(keyboardView)
    }

    /* ═══════ Text helpers ═══════════════════════════════════ */

    /**
     * Get the full text from the current input field.
     * Returns null if no text available or InputConnection is stale.
     */
    private fun getContextText(ic: InputConnection): String? {
        return try {
            val before = ic.getTextBeforeCursor(5000, 0)
            val after  = ic.getTextAfterCursor(5000, 0)
            val combined = (before?.toString() ?: "") + (after?.toString() ?: "")
            if (combined.isEmpty()) null else combined
        } catch (e: Exception) {
            null
        }
    }

    private fun replaceText(ic: InputConnection, newText: String) {
        ic.beginBatchEdit()
        ic.performContextMenuAction(android.R.id.selectAll)
        ic.commitText(newText, 1)
        ic.endBatchEdit()
    }

    private fun copyToClipboard(text: String) {
        val cm = getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager
        cm.setPrimaryClip(android.content.ClipData.newPlainText("Reword", text))
        showToast("Скопировано")
    }

    private fun performHaptic() {
        if (::keyboardView.isInitialized)
            keyboardView.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP)
    }

    private fun showToast(msg: String) {
        android.widget.Toast.makeText(this, msg, android.widget.Toast.LENGTH_SHORT).show()
    }
}
