/**
 * KeyboardView – Main Keyboard UI for Android
 *
 * ● Flicker-free: buttons created once, only text/visibility updated on layout change.
 * ● Supports Russian + English QWERTY + two symbol pages.
 * ● Grammarly-style toolbar: [AI menu] … suggestions … [✨ instant check]
 * ● Gboard-dark colour scheme.
 */

package ai.reword.keyboard.views

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.AttributeSet
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.widget.*
import ai.reword.keyboard.models.ParaphraseMode

class KeyboardView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    /* ────── listener ────────────────────────────────────────── */
    interface KeyboardListener {
        fun onKeyPressed(key: String)
        fun onDeletePressed()
        fun onDeleteLongPressStart()
        fun onDeleteLongPressEnd()
        fun onEnterPressed()
        fun onSpacePressed()
        fun onShiftPressed()
        fun onLanguageToggle()
        fun onMenuPressed()
        fun onInstantCheckPressed()
        fun onSuggestionPicked(word: String)
    }

    var listener: KeyboardListener? = null

    /* ────── public state ────────────────────────────────────── */
    var isShifted = false; private set
    var isCapsLocked = false; private set
    var isEnglishLayout = false; private set

    private var isSymbolMode = false
    private var symbolPage = 0
    private var currentMode: ParaphraseMode = ParaphraseMode.PROFESSIONAL

    /* ────── colours (Gboard-dark) ───────────────────────────── */
    private val COL_BG         = 0xFF1B1B1D.toInt()
    private val COL_KEY        = 0xFF2C2C2E.toInt()
    private val COL_KEY_PRESS  = 0xFF505052.toInt()
    private val COL_SPECIAL    = 0xFF3A3A3C.toInt()
    private val COL_ACCENT     = 0xFF4A8FD9.toInt()
    private val COL_PURPLE     = 0xFF9B6DFF.toInt()
    private val COL_TEXT       = 0xFFE5E5E7.toInt()
    private val COL_TOOLBAR    = 0xFF232325.toInt()

    /* ────── dimension helpers (dp → px) ─────────────────────── */
    private fun dp(v: Int) = (v * resources.displayMetrics.density + 0.5f).toInt()

    /* ────── key layouts ─────────────────────────────────────── */
    private val numberRow = arrayOf("1","2","3","4","5","6","7","8","9","0")

    private val ruLo = arrayOf(
        arrayOf("й","ц","у","к","е","н","г","ш","щ","з","х"),
        arrayOf("ф","ы","в","а","п","р","о","л","д","ж","э"),
        arrayOf("SHIFT","я","ч","с","м","и","т","ь","б","ю","DEL"))
    private val ruHi = arrayOf(
        arrayOf("Й","Ц","У","К","Е","Н","Г","Ш","Щ","З","Х"),
        arrayOf("Ф","Ы","В","А","П","Р","О","Л","Д","Ж","Э"),
        arrayOf("SHIFT","Я","Ч","С","М","И","Т","Ь","Б","Ю","DEL"))

    private val enLo = arrayOf(
        arrayOf("q","w","e","r","t","y","u","i","o","p"),
        arrayOf("a","s","d","f","g","h","j","k","l"),
        arrayOf("SHIFT","z","x","c","v","b","n","m","DEL"))
    private val enHi = arrayOf(
        arrayOf("Q","W","E","R","T","Y","U","I","O","P"),
        arrayOf("A","S","D","F","G","H","J","K","L"),
        arrayOf("SHIFT","Z","X","C","V","B","N","M","DEL"))

    private val sym1 = arrayOf(
        arrayOf("!","@","#","$","%","^","&","*","(",")"),
        arrayOf("-","=","+","/","\\","|","[","]","{","}"),
        arrayOf("SYM2",".",",",":",";","'","\"","?","!","DEL"))
    private val sym2 = arrayOf(
        arrayOf("~","`","€","₽","£","¥","©","®","™","°"),
        arrayOf("«","»","—","–","…","•","§","¶","№","₹"),
        arrayOf("ABC","<",">","_","↑","↓","←","→","±","DEL"))

    /* ────── cached button matrix ────────────────────────────── */
    private val MAX_COLS = 11                       // Russian widest
    private val numBtns = mutableListOf<Button>()
    private val keyBtns = Array(3) { arrayOfNulls<Button>(MAX_COLS) }
    private var spaceBtn: Button? = null
    private var symToggle: Button? = null
    private var enterBtn: Button? = null

    /* ────── toolbar views ───────────────────────────────────── */
    private lateinit var suggestionBox: LinearLayout

    /* ────── section containers (for AI overlay swap) ────────── */
    private lateinit var keysSection: LinearLayout   // number + 3 rows
    private lateinit var actionSection: LinearLayout  // bottom row

    /* ════════════════════════════════════════════════════════════
       INIT — build entire hierarchy ONCE
       ════════════════════════════════════════════════════════ */
    init {
        orientation = VERTICAL
        setBackgroundColor(COL_BG)

        /* 1) Toolbar */
        addView(buildToolbar())

        /* 2) Keys section (number row + 3 letter rows) */
        keysSection = LinearLayout(context).apply {
            orientation = VERTICAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
        }
        keysSection.addView(buildNumberRow())
        for (r in 0..2) keysSection.addView(buildKeyRow(r))
        addView(keysSection)

        /* 3) Action row */
        actionSection = buildActionRow()
        addView(actionSection)

        /* populate for the first time */
        applyLayout()
    }

    /* ────── toolbar ─────────────────────────────────────────── */
    private fun buildToolbar(): LinearLayout {
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(40))
            setBackgroundColor(COL_TOOLBAR)
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(6), 0, dp(6), 0)

            /* AI menu button */
            addView(TextView(context).apply {
                text = "✦"
                textSize = 16f
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
                val s = dp(30)
                layoutParams = LayoutParams(s, s).apply { marginEnd = dp(6) }
                background = roundedBg(COL_PURPLE, dp(15).toFloat())
                isClickable = true; isFocusable = true
                setOnClickListener { listener?.onMenuPressed() }
            })

            /* Suggestion area */
            suggestionBox = LinearLayout(context).apply {
                orientation = HORIZONTAL
                layoutParams = LayoutParams(0, LayoutParams.MATCH_PARENT, 1f)
                gravity = Gravity.CENTER_VERTICAL
                clipChildren = false
            }
            addView(suggestionBox)

            /* Instant-check button */
            addView(TextView(context).apply {
                text = "✨"
                textSize = 16f
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
                val s = dp(30)
                layoutParams = LayoutParams(s, s).apply { marginStart = dp(6) }
                background = roundedBg(COL_ACCENT, dp(15).toFloat())
                isClickable = true; isFocusable = true
                setOnClickListener { listener?.onInstantCheckPressed() }
            })
        }
    }

    /* ────── number row ──────────────────────────────────────── */
    private fun buildNumberRow(): LinearLayout {
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(38))
            gravity = Gravity.CENTER
            setPadding(dp(3), dp(3), dp(3), dp(1))

            for (ch in numberRow) {
                val b = keyBtn(ch, 15f)
                numBtns.add(b)
                addView(b)
            }
        }
    }

    /* ────── letter row (3×MAX_COLS, hidden overflow) ────────── */
    private fun buildKeyRow(row: Int): LinearLayout {
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(44))
            gravity = Gravity.CENTER
            setPadding(dp(3), dp(2), dp(3), dp(2))

            for (c in 0 until MAX_COLS) {
                val b = keyBtn("", 20f)
                keyBtns[row][c] = b
                addView(b)
            }
        }
    }

    /* ────── action row ──────────────────────────────────────── */
    private fun buildActionRow(): LinearLayout {
        val h = dp(42)
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(48))
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(3), dp(2), dp(3), dp(6))

            /* Globe */
            addView(actionBtn("🌐", dp(38), h) { listener?.onLanguageToggle() })

            /* ?123 / ABC / АБВ */
            symToggle = Button(context).apply {
                text = "?123"
                textSize = 12f; setTextColor(COL_TEXT)
                isAllCaps = false
                background = roundedBg(COL_SPECIAL)
                layoutParams = LayoutParams(0, h, 0.9f).apply { setMargins(dp(2),0,dp(2),0) }
                setPadding(0,0,0,0); minWidth = 0; minHeight = 0
                setOnClickListener {
                    if (isSymbolMode) { isSymbolMode = false } else { isSymbolMode = true; symbolPage = 0 }
                    applyLayout()
                }
            }
            addView(symToggle!!)

            /* Comma */
            addView(actionBtn(",", dp(34), h) { listener?.onKeyPressed(",") })

            /* Space */
            spaceBtn = Button(context).apply {
                text = "Русский"
                textSize = 12f; setTextColor(COL_TEXT); isAllCaps = false
                background = roundedBg(COL_KEY)
                layoutParams = LayoutParams(0, h, 3f).apply { setMargins(dp(2),0,dp(2),0) }
                setPadding(0,0,0,0); minWidth = 0; minHeight = 0
                setOnClickListener { listener?.onSpacePressed() }
            }
            addView(spaceBtn!!)

            /* Dot */
            addView(actionBtn(".", dp(34), h) { listener?.onKeyPressed(".") })

            /* Enter */
            enterBtn = Button(context).apply {
                text = "⏎"; textSize = 18f; setTextColor(Color.WHITE)
                isAllCaps = false
                background = roundedBg(COL_ACCENT)
                layoutParams = LayoutParams(dp(46), h).apply { setMargins(dp(2),0,dp(2),0) }
                setPadding(0,0,0,0); minWidth = 0; minHeight = 0
                setOnClickListener { listener?.onEnterPressed() }
            }
            addView(enterBtn!!)
        }
    }

    /* ════════════════════════════════════════════════════════════
       APPLY LAYOUT — update text + visibility, ZERO removeAll
       ════════════════════════════════════════════════════════ */
    private fun applyLayout() {
        val keys = activeKeys()
        for (r in 0..2) {
            val row = keys[r]
            for (c in 0 until MAX_COLS) {
                val btn = keyBtns[r][c] ?: continue
                if (c >= row.size) {
                    btn.visibility = GONE; continue
                }
                btn.visibility = VISIBLE
                val label = row[c]
                when (label) {
                    "SHIFT" -> {
                        btn.text = "⇧"
                        btn.background = shiftBg()
                        btn.setTextColor(shiftColor())
                        setWeight(btn, 1.5f)
                    }
                    "DEL" -> {
                        btn.text = "⌫"
                        btn.background = roundedBg(COL_SPECIAL)
                        btn.setTextColor(COL_TEXT)
                        setWeight(btn, 1.3f)
                    }
                    "SYM2" -> {
                        btn.text = "#+"; btn.background = roundedBg(COL_SPECIAL)
                        btn.setTextColor(COL_TEXT); setWeight(btn, 1.4f)
                    }
                    "ABC" -> {
                        btn.text = if (isEnglishLayout) "ABC" else "АБВ"
                        btn.background = roundedBg(COL_SPECIAL)
                        btn.setTextColor(COL_TEXT); setWeight(btn, 1.4f)
                    }
                    else -> {
                        btn.text = label
                        btn.background = roundedBg(COL_KEY)
                        btn.setTextColor(COL_TEXT)
                        setWeight(btn, 1f)
                    }
                }
            }
        }
        spaceBtn?.text = if (isEnglishLayout) "English" else "Русский"
        symToggle?.text = if (isSymbolMode) (if (isEnglishLayout) "ABC" else "АБВ") else "?123"
    }

    private fun activeKeys(): Array<Array<String>> = when {
        isSymbolMode && symbolPage == 0 -> sym1
        isSymbolMode && symbolPage == 1 -> sym2
        isEnglishLayout && (isShifted || isCapsLocked) -> enHi
        isEnglishLayout -> enLo
        isShifted || isCapsLocked -> ruHi
        else -> ruLo
    }

    /* ════════════════════════════════════════════════════════════
       PUBLIC API
       ════════════════════════════════════════════════════════ */
    fun toggleShift() {
        when {
            isCapsLocked -> { isShifted = false; isCapsLocked = false }
            isShifted    -> { isCapsLocked = true }
            else         -> { isShifted = true }
        }
        applyLayout()
    }

    fun setShift(on: Boolean) {
        isShifted = on; if (!on) isCapsLocked = false
        applyLayout()
    }

    fun toggleLanguage() {
        isEnglishLayout = !isEnglishLayout
        isSymbolMode = false
        applyLayout()
    }

    fun setMode(mode: ParaphraseMode) { currentMode = mode }

    fun reset() { isShifted = false; isCapsLocked = false; applyLayout() }

    fun updateReturnKeyType(imeOpts: Int) { /* optionally change ⏎ icon */ }

    fun setLoading(loading: Boolean) { /* toolbar spinner if desired */ }

    /* ────── suggestions ─────────────────────────────────────── */
    fun updateSuggestions(list: List<String>) {
        suggestionBox.removeAllViews()
        for (word in list) {
            suggestionBox.addView(TextView(context).apply {
                text = word; textSize = 14f; setTextColor(COL_TEXT)
                gravity = Gravity.CENTER
                setPadding(dp(12), dp(4), dp(12), dp(4))
                background = roundedBg(COL_KEY, dp(6).toFloat())
                layoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, dp(30)).apply {
                    setMargins(dp(3), 0, dp(3), 0)
                }
                isClickable = true; isFocusable = true
                setOnClickListener { listener?.onSuggestionPicked(word) }
            })
        }
    }

    fun clearSuggestions() { suggestionBox.removeAllViews() }

    /* ────── AI overlay ──────────────────────────────────────── */
    fun showAIMenu() {
        keysSection.visibility = GONE
        actionSection.visibility = GONE
        if (findViewWithTag<View>("ai_overlay") == null) {
            val ov = AIMenuOverlay(context).apply {
                tag = "ai_overlay"
                onDismiss = { hideAIMenu() }
                onModeSelected = { mode ->
                    listener?.onKeyPressed("MODE:${mode.name}")
                    hideAIMenu()
                }
            }
            addView(ov)
        }
    }

    fun hideAIMenu() {
        findViewWithTag<View>("ai_overlay")?.let { removeView(it) }
        keysSection.visibility = VISIBLE
        actionSection.visibility = VISIBLE
    }

    /* back-compat stub */
    fun setSuggestionStripListener(l: SuggestionStripListener) {}

    /* ════════════════════════════════════════════════════════════
       PRIVATE HELPERS
       ════════════════════════════════════════════════════════ */
    /* ────── long-press tracking for delete key ──────────────── */
    private var deleteButtonDown = false
    private val longPressDelay = 300L   // ms to trigger long-press
    private val longPressHandler = android.os.Handler(android.os.Looper.getMainLooper())

    private fun keyBtn(label: String, size: Float): Button {
        return Button(context).apply {
            text = label; textSize = size
            setTextColor(COL_TEXT); isAllCaps = false
            typeface = Typeface.DEFAULT
            background = roundedBg(COL_KEY)
            layoutParams = LayoutParams(0, LayoutParams.MATCH_PARENT, 1f).apply {
                setMargins(dp(2), dp(1), dp(2), dp(1))
            }
            setPadding(0,0,0,0); minWidth = 0; minHeight = 0

            // Use touch listener for immediate response (fire on ACTION_DOWN)
            // This eliminates the click delay that causes missing characters
            setOnTouchListener { v, ev ->
                val btn = v as Button
                val key = btn.text.toString()
                when (ev.action) {
                    MotionEvent.ACTION_DOWN -> {
                        btn.background = roundedBg(COL_KEY_PRESS)
                        // Fire key immediately on touch down for all keys
                        if (key == "⌫") {
                            deleteButtonDown = true
                            listener?.onDeletePressed()
                            // Schedule long-press repeat
                            longPressHandler.postDelayed({
                                if (deleteButtonDown) {
                                    listener?.onDeleteLongPressStart()
                                }
                            }, longPressDelay)
                        } else {
                            handleKeyClick(key)
                        }
                    }
                    MotionEvent.ACTION_UP -> {
                        restoreBg(btn)
                        if (key == "⌫" && deleteButtonDown) {
                            deleteButtonDown = false
                            longPressHandler.removeCallbacksAndMessages(null)
                            listener?.onDeleteLongPressEnd()
                        }
                    }
                    MotionEvent.ACTION_CANCEL -> {
                        restoreBg(btn)
                        if (key == "⌫" && deleteButtonDown) {
                            deleteButtonDown = false
                            longPressHandler.removeCallbacksAndMessages(null)
                            listener?.onDeleteLongPressEnd()
                        }
                    }
                }
                true  // consume the event — we handle click ourselves
            }
        }
    }

    private fun actionBtn(label: String, w: Int, h: Int, click: () -> Unit): Button {
        return Button(context).apply {
            text = label; textSize = 18f; setTextColor(COL_TEXT); isAllCaps = false
            background = roundedBg(COL_SPECIAL)
            layoutParams = LayoutParams(w, h).apply { setMargins(dp(2),0,dp(2),0) }
            setPadding(0,0,0,0); minWidth = 0; minHeight = 0
            setOnClickListener { click() }
        }
    }

    private fun handleKeyClick(key: String) {
        when (key) {
            "⇧" -> listener?.onShiftPressed()
            "⌫" -> listener?.onDeletePressed()
            "#+", "?123" -> {
                if (isSymbolMode) symbolPage = if (symbolPage == 0) 1 else 0
                else { isSymbolMode = true; symbolPage = 0 }
                applyLayout()
            }
            "АБВ", "ABC" -> { isSymbolMode = false; applyLayout() }
            else -> listener?.onKeyPressed(key)
        }
    }

    private fun restoreBg(btn: Button) {
        val t = btn.text.toString()
        btn.background = when (t) {
            "⇧" -> shiftBg()
            "⌫", "#+", "?123", "АБВ", "ABC" -> roundedBg(COL_SPECIAL)
            else -> roundedBg(COL_KEY)
        }
    }

    private fun shiftBg(): GradientDrawable = when {
        isCapsLocked -> roundedBg(0xFF3D5A80.toInt())
        isShifted    -> roundedBg(0xFF444446.toInt())
        else         -> roundedBg(COL_SPECIAL)
    }

    private fun shiftColor(): Int = when {
        isCapsLocked -> 0xFF4A8FD9.toInt()
        isShifted    -> Color.WHITE
        else         -> COL_TEXT
    }

    private fun setWeight(btn: Button, w: Float) {
        (btn.layoutParams as LayoutParams).weight = w
    }

    private fun roundedBg(color: Int, r: Float = dp(6).toFloat()) =
        GradientDrawable().apply { setColor(color); cornerRadius = r }
}

/* ═══════════════════════════════════════════════════════════════
   AI MENU OVERLAY — shown in place of keys area
   ═══════════════════════════════════════════════════════════ */
class AIMenuOverlay @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    var onDismiss: (() -> Unit)? = null
    var onModeSelected: ((ParaphraseMode) -> Unit)? = null

    private val C_BG   = 0xFF232325.toInt()
    private val C_CARD = 0xFF2C2C2E.toInt()
    private val C_TEXT = 0xFFE5E5E7.toInt()

    private fun dp(v: Int) = (v * resources.displayMetrics.density + 0.5f).toInt()

    init {
        orientation = VERTICAL
        setBackgroundColor(C_BG)
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
        setPadding(dp(12), dp(8), dp(12), dp(12))

        /* header */
        addView(LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0,0,0,dp(8))

            addView(TextView(context).apply {
                text = "✦ Улучшить текст"; textSize = 16f
                setTextColor(Color.WHITE); typeface = Typeface.DEFAULT_BOLD
                layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f)
            })
            addView(TextView(context).apply {
                text = "✕"; textSize = 18f; setTextColor(0xFF888888.toInt())
                gravity = Gravity.CENTER; val s = dp(32)
                layoutParams = LayoutParams(s, s)
                isClickable = true; isFocusable = true
                setOnClickListener { onDismiss?.invoke() }
            })
        })

        /* divider */
        addView(View(context).apply {
            setBackgroundColor(0xFF3A3A3C.toInt())
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 1)
        })

        /* mode grid (2 cols) */
        val modes = ParaphraseMode.values()
        var row: LinearLayout? = null
        for ((i, mode) in modes.withIndex()) {
            if (i % 2 == 0) {
                row = LinearLayout(context).apply {
                    orientation = HORIZONTAL
                    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
                    setPadding(0, dp(3), 0, dp(3))
                }
                addView(row)
            }
            row?.addView(TextView(context).apply {
                text = "${mode.emoji} ${mode.displayName}"; textSize = 14f
                setTextColor(C_TEXT); gravity = Gravity.CENTER
                setPadding(dp(8), dp(12), dp(8), dp(12))
                background = GradientDrawable().apply { setColor(C_CARD); cornerRadius = dp(10).toFloat() }
                layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f).apply {
                    setMargins(dp(3),0,dp(3),0)
                }
                isClickable = true; isFocusable = true
                setOnClickListener { onModeSelected?.invoke(mode) }
            })
        }

        /* bottom keyboard-return button */
        addView(LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(44))
            gravity = Gravity.CENTER; setPadding(0, dp(4), 0, dp(2))

            addView(TextView(context).apply {
                text = "⌨ Клавиатура"; textSize = 14f; setTextColor(C_TEXT)
                gravity = Gravity.CENTER; setPadding(dp(16), dp(8), dp(16), dp(8))
                background = GradientDrawable().apply { setColor(C_CARD); cornerRadius = dp(10).toFloat() }
                isClickable = true; isFocusable = true
                setOnClickListener { onDismiss?.invoke() }
            })
        })
    }
}
