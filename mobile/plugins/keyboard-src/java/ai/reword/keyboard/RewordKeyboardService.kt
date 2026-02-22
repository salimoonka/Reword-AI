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
import android.os.Handler
import android.os.Looper
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
        keyboardView = KeyboardView(this).apply {
            listener = this@RewordKeyboardService
            setMode(currentMode)
        }
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
        if (::keyboardView.isInitialized) keyboardView.reset()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopDeleteRepeat()
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
            ic.deleteSurroundingText(1, 0)
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
        val before = ic.getTextBeforeCursor(50, 0)?.toString() ?: ""
        val word = before.split(Regex("\\s+")).lastOrNull() ?: ""
        if (word.length >= 2) {
            val list = suggestionProvider.getSuggestions(word, 5)
            keyboardView.updateSuggestions(list)
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
