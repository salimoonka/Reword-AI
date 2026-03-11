/**
 * KeyboardView - Keyboard UI for Android
 *
 * Design:
 *  - Light grey background (#D1D3D9)
 *  - White rounded keys (uniform colour for ALL keys including functional)
 *  - 4 rows: 3 letter rows + 1 action row
 *  - Bottom bar: globe (language) + mic (voice)
 *  - Toolbar: [AI menu left] suggestions [check right] - circular buttons
 *  - Built-in emoji picker (iOS-style horizontal paging, 4x7 grid)
 *  - AI menu overlay with generation workflow
 */

package ai.reword.keyboard.views

import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.util.AttributeSet
import android.view.Gravity
import android.animation.ValueAnimator
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.widget.*
import ai.reword.keyboard.models.ParaphraseMode

class KeyboardView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    /* listener */
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
        fun onVoiceInputPressed()
    }

    var listener: KeyboardListener? = null

    /* public state */
    var isShifted = false; private set
    var isCapsLocked = false; private set
    var isEnglishLayout = false; private set

    private var isSymbolMode = false
    private var symbolPage = 0
    private var isEmojiMode = false
    private var isEmojiSearchMode = false
    private var emojiSearchQuery = ""
    private var currentMode: ParaphraseMode = ParaphraseMode.PROFESSIONAL
    private var selectedEmojiCategory = 0  // 0 = frequent, 1..7 = data categories

    /* Theme detection — reads app preference from SharedPreferences.
       For "auto", uses UiModeManager (immune to Appearance.setColorScheme()
       overrides from React Native) as primary source, with Resources.getSystem()
       as fallback. */
    val isDarkTheme: Boolean = detectDarkTheme(context)

    companion object {
        /** Detect dark theme from SharedPreferences + real system config. */
        fun detectDarkTheme(ctx: Context): Boolean {
            val prefs = ctx.getSharedPreferences("reword_shared_prefs", Context.MODE_PRIVATE)
            return when (prefs.getString("theme_mode", "auto")) {
                "dark"  -> true
                "light" -> false
                else    -> {
                    /* "auto" — determine actual system dark mode.
                       UiModeManager is the most reliable source: it reflects the
                       device-level setting and is NOT affected by
                       AppCompatDelegate.setDefaultNightMode() which React Native's
                       Appearance.setColorScheme() calls under the hood. */
                    val mgr = ctx.getSystemService(Context.UI_MODE_SERVICE) as? android.app.UiModeManager
                    if (mgr != null) {
                        when (mgr.nightMode) {
                            android.app.UiModeManager.MODE_NIGHT_YES -> return true
                            android.app.UiModeManager.MODE_NIGHT_NO -> return false
                            // MODE_NIGHT_AUTO / MODE_NIGHT_CUSTOM — fall through to resource check
                        }
                    }
                    /* Fallback: system-global resource config. */
                    val sysUiMode = android.content.res.Resources.getSystem().configuration.uiMode
                    (sysUiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
                }
            }
        }
    }

    /* Colours - theme-aware, Apple-keyboard-style */
    private val COL_BG        = if (isDarkTheme) 0xFF1C1C1E.toInt() else 0xFFD1D3D9.toInt()
    private val COL_KEY       = if (isDarkTheme) 0xFF3A3A3C.toInt() else 0xFFFFFFFF.toInt()
    private val COL_KEY_PRESS = if (isDarkTheme) 0xFF545456.toInt() else 0xFFBDBDBD.toInt()
    private val COL_TEXT      = if (isDarkTheme) 0xFFFFFFFF.toInt() else 0xFF000000.toInt()
    private val COL_TEXT_SEC  = if (isDarkTheme) 0xFFAAAAAA.toInt() else 0xFF555555.toInt()
    private val COL_TOOLBAR   = COL_BG   // unified – no visual separation
    private val COL_BOTTOM    = COL_BG   // unified – no visual separation

    /* Emoji picker colours — emoji area uses pure black/white so emojis
       render at full saturation without a grey tint dimming them. */
    private val COL_EMOJI_BG      = if (isDarkTheme) COL_BG else 0xFFFFFFFF.toInt()
    private val COL_EMOJI_SEARCH  = if (isDarkTheme) 0xFF1C1C1E.toInt() else 0xFFE8E8E8.toInt()
    private val COL_EMOJI_CAT_SEL = if (isDarkTheme) 0xFF48484A.toInt() else 0xFFD0D0D4.toInt()

    /* Icon size in px for toolbar circular buttons */
    private val ICON_SIZE_TB = dp(20)
    /* Icon size for bottom bar — slightly larger for visibility */
    private val ICON_SIZE_BB = dp(28)

    private fun dp(v: Int) = (v * resources.displayMetrics.density + 0.5f).toInt()

    /* key layouts */
    private val ruLo = arrayOf(
        arrayOf("\u0439","\u0446","\u0443","\u043A","\u0435","\u043D","\u0433","\u0448","\u0449","\u0437","\u0445"),
        arrayOf("\u0444","\u044B","\u0432","\u0430","\u043F","\u0440","\u043E","\u043B","\u0434","\u0436","\u044D"),
        arrayOf("SHIFT","\u044F","\u0447","\u0441","\u043C","\u0438","\u0442","\u044C","\u0431","\u044E","DEL"))
    private val ruHi = arrayOf(
        arrayOf("\u0419","\u0426","\u0423","\u041A","\u0415","\u041D","\u0413","\u0428","\u0429","\u0417","\u0425"),
        arrayOf("\u0424","\u042B","\u0412","\u0410","\u041F","\u0420","\u041E","\u041B","\u0414","\u0416","\u042D"),
        arrayOf("SHIFT","\u042F","\u0427","\u0421","\u041C","\u0418","\u0422","\u042C","\u0411","\u042E","DEL"))
    private val enLo = arrayOf(
        arrayOf("q","w","e","r","t","y","u","i","o","p"),
        arrayOf("a","s","d","f","g","h","j","k","l"),
        arrayOf("SHIFT","z","x","c","v","b","n","m","DEL"))
    private val enHi = arrayOf(
        arrayOf("Q","W","E","R","T","Y","U","I","O","P"),
        arrayOf("A","S","D","F","G","H","J","K","L"),
        arrayOf("SHIFT","Z","X","C","V","B","N","M","DEL"))
    private val num1 = arrayOf(
        arrayOf("1","2","3","4","5","6","7","8","9","0"),
        arrayOf("-","/",":",";","(",")","$","&","@","\""),
        arrayOf("SYM2",".",",","?","!","'","DEL"))
    private val num2 = arrayOf(
        arrayOf("[","]","{","}","#","%","^","*","+","="),
        arrayOf("_","\\","|","~","<",">","\u20AC","\u00A3","\u00A5","\u2022"),
        arrayOf("NUM1",".",",","?","!","'","DEL"))

    /* cached views */
    private val MAX_COLS = 11
    private val keyBtns = Array(3) { arrayOfNulls<Button>(MAX_COLS) }
    private var spaceBtn: Button? = null
    private var symToggle: Button? = null
    private var enterBtn: Button? = null

    private lateinit var toolbar: LinearLayout
    private lateinit var suggestionBox: LinearLayout
    private lateinit var keysSection: LinearLayout
    private lateinit var actionSection: LinearLayout
    private lateinit var bottomBar: LinearLayout
    private var emojiContainer: FrameLayout? = null
    private var emojiGridHost: FrameLayout? = null
    private var emojiScrollView: HorizontalScrollView? = null
    private var emojiCategoryViews = mutableListOf<View>()
    private var emojiSectionOffsets = intArrayOf()
    private var emojiColWidth = 0
    private var emojiSnapAnimator: ValueAnimator? = null
    private var emojiSearchResultsRow: FrameLayout? = null
    private var emojiSearchTextView: TextView? = null
    private var emojiSearchClearBtn: ImageView? = null

    /* ================================================================
       INIT
       ================================================================ */
    init {
        orientation = VERTICAL
        setBackgroundColor(COL_BG)

        /* Prevent Android's "Force Dark" (Q+) from inverting our manually-themed
           keyboard colours. Without this, some devices/OEMs apply a dark filter
           on top of our light-theme keys, making the keyboard appear dark even
           when the system is in light mode. */
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            isForceDarkAllowed = false
        }

        toolbar = buildToolbar()
        addView(toolbar)
        keysSection = LinearLayout(context).apply {
            orientation = VERTICAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
        }
        for (r in 0..2) keysSection.addView(buildKeyRow(r))
        addView(keysSection)
        actionSection = buildActionRow()
        addView(actionSection)
        bottomBar = buildBottomBar()
        addView(bottomBar)
        applyLayout()
    }

    /* ================================================================
       TOOLBAR - [AI menu LEFT] suggestions [check RIGHT]
       Circular buttons, white bg matching keys, minimalist icons
       ================================================================ */
    private fun buildToolbar(): LinearLayout {
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(44))
            setBackgroundColor(COL_TOOLBAR)
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(8), dp(4), dp(8), dp(2))

            val btnSize = dp(36)
            val btnRadius = dp(18).toFloat()

            /* LEFT: AI Menu - circular, sparkle icon drawable */
            addView(ImageView(context).apply {
                val icon = KeyboardIcons.sparkle(COL_TEXT, ICON_SIZE_TB)
                setImageDrawable(icon)
                scaleType = ImageView.ScaleType.CENTER
                layoutParams = LayoutParams(btnSize, btnSize).apply { marginEnd = dp(8) }
                background = roundedBg(COL_KEY, btnRadius)
                isClickable = true; isFocusable = true
                setOnClickListener { listener?.onMenuPressed() }
            })

            /* Suggestions */
            suggestionBox = LinearLayout(context).apply {
                orientation = HORIZONTAL
                layoutParams = LayoutParams(0, LayoutParams.MATCH_PARENT, 1f)
                gravity = Gravity.CENTER_VERTICAL
                clipChildren = false
            }
            addView(suggestionBox)

            /* RIGHT: Instant Check - circular, checkmark icon drawable */
            addView(ImageView(context).apply {
                val icon = KeyboardIcons.checkmark(COL_TEXT, ICON_SIZE_TB)
                setImageDrawable(icon)
                scaleType = ImageView.ScaleType.CENTER
                layoutParams = LayoutParams(btnSize, btnSize).apply { marginStart = dp(8) }
                background = roundedBg(COL_KEY, btnRadius)
                isClickable = true; isFocusable = true
                setOnClickListener { listener?.onInstantCheckPressed() }
            })
        }
    }

    /* key rows (3 rows, up to 11 buttons) */
    private fun buildKeyRow(row: Int): LinearLayout {
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(46))
            gravity = Gravity.CENTER
            setPadding(dp(3), dp(2), dp(3), dp(2))
            for (c in 0 until MAX_COLS) {
                val b = createKeyButton("")
                keyBtns[row][c] = b
                addView(b)
            }
        }
    }

    /* ================================================================
       ACTION ROW - ABC/123 | emoji | space | enter
       No globe (moved to bottom bar). All keys same white bg.
       ================================================================ */
    private fun buildActionRow(): LinearLayout {
        val h = dp(44)
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(52))
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(3), dp(2), dp(3), dp(4))

            /* ABC/123 toggle */
            symToggle = Button(context).apply {
                text = "123"
                textSize = 16f; setTextColor(COL_TEXT)
                isAllCaps = false; typeface = Typeface.DEFAULT
                background = roundedBg(COL_KEY, dp(5).toFloat())
                layoutParams = LayoutParams(dp(50), h).apply { setMargins(dp(2), 0, dp(2), 0) }
                setPadding(0,0,0,0); minWidth = 0; minHeight = 0
                setOnClickListener {
                    if (isEmojiMode && !isEmojiSearchMode) hideEmojiPicker()
                    if (isSymbolMode) isSymbolMode = false
                    else { isSymbolMode = true; symbolPage = 0 }
                    applyLayout()
                }
            }
            addView(symToggle!!)

            /* Emoji - smiley drawable instead of 😊 emoji */
            addView(ImageView(context).apply {
                setImageDrawable(KeyboardIcons.smiley(COL_TEXT, dp(24)))
                scaleType = ImageView.ScaleType.CENTER
                background = roundedBg(COL_KEY, dp(5).toFloat())
                layoutParams = LayoutParams(dp(44), h).apply { setMargins(dp(2), 0, dp(2), 0) }
                isClickable = true; isFocusable = true
                setOnClickListener { toggleEmojiPicker() }
            })

            /* Space — no text label (clean Apple style) */
            spaceBtn = Button(context).apply {
                text = ""
                textSize = 14f; setTextColor(COL_TEXT); isAllCaps = false
                typeface = Typeface.DEFAULT
                background = roundedBg(COL_KEY, dp(5).toFloat())
                layoutParams = LayoutParams(0, h, 1f).apply { setMargins(dp(3), 0, dp(3), 0) }
                setPadding(0,0,0,0); minWidth = 0; minHeight = 0
                setOnClickListener {
                    if (isEmojiSearchMode) {
                        emojiSearchQuery += " "
                        updateEmojiSearchDisplay()
                    } else {
                        listener?.onSpacePressed()
                    }
                }
            }
            addView(spaceBtn!!)

            /* Enter — wider key with return-arrow drawable */
            enterBtn = Button(context).apply {
                text = ""
                isAllCaps = false
                background = roundedBg(COL_KEY, dp(5).toFloat())
                layoutParams = LayoutParams(dp(72), h).apply { setMargins(dp(2), 0, dp(2), 0) }
                setPadding(0,0,0,0); minWidth = 0; minHeight = 0
                setOnClickListener {
                    if (isEmojiSearchMode) {
                        exitEmojiSearchMode()
                    } else {
                        listener?.onEnterPressed()
                    }
                }
            }
            // Draw return-arrow icon on top of the button
            enterBtn!!.post {
                updateEnterButtonIcon()
            }
            addView(enterBtn!!)
        }
    }

    /* ================================================================
       BOTTOM BAR - globe (language) + mic (voice input)
       Matches Gboard bottom strip layout
       ================================================================ */
    private fun buildBottomBar(): LinearLayout {
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(44))
            setBackgroundColor(COL_BOTTOM)
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(16), dp(4), dp(16), dp(8))

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                isForceDarkAllowed = false
            }

            /* Globe - language toggle (monochrome vector) */
            addView(ImageView(context).apply {
                setImageDrawable(KeyboardIcons.globe(COL_TEXT, ICON_SIZE_BB))
                setColorFilter(COL_TEXT, android.graphics.PorterDuff.Mode.SRC_IN)
                scaleType = ImageView.ScaleType.CENTER
                layoutParams = LayoutParams(dp(40), dp(40))
                isClickable = true; isFocusable = true
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    isForceDarkAllowed = false
                }
                setOnClickListener { listener?.onLanguageToggle() }
            })

            /* Spacer */
            addView(View(context).apply {
                layoutParams = LayoutParams(0, 0, 1f)
            })

            /* Mic - voice input (monochrome vector) */
            addView(ImageView(context).apply {
                setImageDrawable(KeyboardIcons.microphone(COL_TEXT, ICON_SIZE_BB))
                setColorFilter(COL_TEXT, android.graphics.PorterDuff.Mode.SRC_IN)
                scaleType = ImageView.ScaleType.CENTER
                layoutParams = LayoutParams(dp(40), dp(40))
                isClickable = true; isFocusable = true
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    isForceDarkAllowed = false
                }
                setOnClickListener { listener?.onVoiceInputPressed() }
            })
        }
    }

    /* ================================================================
       APPLY LAYOUT - ALL keys use COL_KEY (uniform white)
       ================================================================ */
    private fun applyLayout() {
        val keys = activeKeys()
        for (r in 0..2) {
            val row = keys[r]
            for (c in 0 until MAX_COLS) {
                val btn = keyBtns[r][c] ?: continue
                if (c >= row.size) { btn.visibility = GONE; continue }
                btn.visibility = VISIBLE
                val label = row[c]
                when (label) {
                    "SHIFT" -> {
                        btn.text = if (isCapsLocked) "\u21EA" else "\u21E7"
                        btn.textSize = 22f
                        btn.setTextColor(android.graphics.Color.TRANSPARENT) // hide text, use icon
                        btn.background = roundedBg(shiftBgColor(), dp(5).toFloat())
                        setWeight(btn, 1.4f)
                        // Draw bold shift arrow icon via foreground
                        val iconSize = dp(20)
                        val icon = KeyboardIcons.shiftArrow(COL_TEXT, iconSize, filled = isCapsLocked || isShifted)
                        icon.setBounds(0, 0, iconSize, iconSize)
                        btn.foreground = object : android.graphics.drawable.Drawable() {
                            override fun draw(canvas: android.graphics.Canvas) {
                                val cx = (btn.width - iconSize) / 2f
                                val cy = (btn.height - iconSize) / 2f
                                canvas.save(); canvas.translate(cx, cy)
                                icon.draw(canvas)
                                canvas.restore()
                            }
                            override fun setAlpha(a: Int) {}
                            override fun setColorFilter(cf: android.graphics.ColorFilter?) {}
                            @Suppress("OVERRIDE_DEPRECATION")
                            override fun getOpacity() = android.graphics.PixelFormat.TRANSLUCENT
                        }
                    }
                    "DEL" -> {
                        btn.foreground = null
                        btn.text = "\u232B"
                        btn.textSize = 20f
                        btn.background = roundedBg(COL_KEY, dp(5).toFloat())
                        btn.setTextColor(COL_TEXT)
                        setWeight(btn, 1.3f)
                    }
                    "SYM2" -> {
                        btn.foreground = null
                        btn.text = "#+="
                        btn.textSize = 14f
                        btn.background = roundedBg(COL_KEY, dp(5).toFloat())
                        btn.setTextColor(COL_TEXT)
                        setWeight(btn, 1.6f)
                    }
                    "NUM1" -> {
                        btn.foreground = null
                        btn.text = "123"
                        btn.textSize = 14f
                        btn.background = roundedBg(COL_KEY, dp(5).toFloat())
                        btn.setTextColor(COL_TEXT)
                        setWeight(btn, 1.6f)
                    }
                    else -> {
                        btn.foreground = null
                        btn.text = label
                        btn.textSize = 22f
                        btn.background = roundedBg(COL_KEY, dp(5).toFloat())
                        btn.setTextColor(COL_TEXT)
                        setWeight(btn, 1f)
                    }
                }
            }
        }
        symToggle?.text = if (isSymbolMode) (if (isEnglishLayout) "ABC" else "\u0410\u0411\u0412") else "123"
        spaceBtn?.text = ""  // blank — Apple style
    }

    private fun activeKeys(): Array<Array<String>> = when {
        isSymbolMode && symbolPage == 0 -> num1
        isSymbolMode && symbolPage == 1 -> num2
        isEnglishLayout && (isShifted || isCapsLocked) -> enHi
        isEnglishLayout -> enLo
        isShifted || isCapsLocked -> ruHi
        else -> ruLo
    }

    /* ================================================================
       EMOJI PICKER – Continuous Apple-style scroll, column snapping
       ================================================================ */
    private val EMOJI_ROWS = 4
    private val EMOJI_VISIBLE_COLS = 7   // ~7 columns visible simultaneously

    private fun toggleEmojiPicker() {
        if (isEmojiMode) hideEmojiPicker() else showEmojiPicker()
    }

    private fun showEmojiPicker() {
        isEmojiMode = true
        isEmojiSearchMode = false
        emojiSearchQuery = ""
        toolbar.visibility = GONE
        keysSection.visibility = GONE
        actionSection.visibility = GONE

        if (emojiContainer == null) {
            emojiContainer = FrameLayout(context).apply {
                layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(290))
                setBackgroundColor(COL_EMOJI_BG)
            }
        }
        /* Always position directly before bottomBar (may have moved in search mode) */
        if (indexOfChild(emojiContainer) >= 0) removeView(emojiContainer)
        addView(emojiContainer, indexOfChild(bottomBar))
        emojiContainer?.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(290))
        emojiContainer?.visibility = VISIBLE
        emojiContainer?.removeAllViews()

        /* Match bottom bar bg to emoji area for uniform look */
        bottomBar.setBackgroundColor(COL_EMOJI_BG)

        val emojiLayout = LinearLayout(context).apply {
            orientation = VERTICAL
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        /* Search bar */
        emojiLayout.addView(buildEmojiSearchBar())

        /* Emoji grid host */
        emojiGridHost = FrameLayout(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f)
        }
        emojiLayout.addView(emojiGridHost)

        /* Category bar */
        emojiLayout.addView(buildEmojiCategoryBar())

        emojiContainer?.addView(emojiLayout)

        /* Build grid after layout to know proper width */
        emojiGridHost?.post { rebuildEmojiGrid() }
    }

    private fun buildEmojiSearchBar(): LinearLayout {
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = GradientDrawable().apply {
                setColor(COL_EMOJI_SEARCH)
                cornerRadius = dp(10).toFloat()
                setStroke(dp(1), 0xFF8E8E93.toInt())
            }
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(36)).apply {
                setMargins(dp(10), dp(8), dp(10), dp(6))
            }
            setPadding(dp(10), 0, dp(8), 0)

            /* Monochrome search icon */
            addView(ImageView(context).apply {
                val icon = KeyboardIcons.searchIcon(COL_TEXT_SEC, dp(16))
                setImageDrawable(icon)
                scaleType = ImageView.ScaleType.CENTER
                layoutParams = LayoutParams(dp(20), LayoutParams.MATCH_PARENT).apply {
                    marginEnd = dp(6)
                }
            })

            /* Search text / placeholder — shows blinking cursor when active */
            emojiSearchTextView = TextView(context).apply {
                text = "\u041F\u043E\u0438\u0441\u043A \u044D\u043C\u043E\u0434\u0437\u0438"
                textSize = 15f
                setTextColor(if (isEmojiSearchMode && emojiSearchQuery.isEmpty()) 0xFF8E8E93.toInt() else 0xFF8E8E93.toInt())
                gravity = Gravity.CENTER_VERTICAL
                layoutParams = LayoutParams(0, LayoutParams.MATCH_PARENT, 1f)
                isSingleLine = true
                // Show cursor when in search mode
                if (isEmojiSearchMode) {
                    isCursorVisible = true
                }
            }
            addView(emojiSearchTextView!!)

            /* Clear (X) button — hidden initially */
            emojiSearchClearBtn = ImageView(context).apply {
                val icon = KeyboardIcons.clearCircle(COL_TEXT_SEC, dp(18))
                setImageDrawable(icon)
                scaleType = ImageView.ScaleType.CENTER
                val sz = dp(30)
                layoutParams = LayoutParams(sz, sz)
                visibility = if (isEmojiSearchMode && emojiSearchQuery.isNotEmpty()) VISIBLE else GONE
                isClickable = true; isFocusable = true
                setOnClickListener {
                    emojiSearchQuery = ""
                    updateEmojiSearchDisplay()
                }
            }
            addView(emojiSearchClearBtn!!)

            /* Tapping the search bar enters search mode */
            isClickable = true; isFocusable = true
            setOnClickListener {
                if (!isEmojiSearchMode) enterEmojiSearchMode()
            }
        }
    }

    private fun hideEmojiPicker() {
        isEmojiMode = false
        isEmojiSearchMode = false
        emojiSearchQuery = ""
        emojiSnapAnimator?.cancel()
        emojiScrollView = null
        emojiContainer?.visibility = GONE
        toolbar.visibility = VISIBLE
        keysSection.visibility = VISIBLE
        actionSection.visibility = VISIBLE
        /* Restore bottom bar bg to default keyboard bg */
        bottomBar.setBackgroundColor(COL_BOTTOM)
        bottomBar.visibility = VISIBLE
        updateEnterButtonIcon()
    }

    /**
     * Build continuous horizontal emoji grid with column snapping.
     * All categories in a single scrollable strip – EMOJI_ROWS rows per column.
     * Small swipe = 1 column, larger = proportionally more.
     */
    private fun rebuildEmojiGrid() {
        val host = emojiGridHost ?: return
        host.removeAllViews()

        val hostWidth = host.width
        if (hostWidth <= 0) return

        val colWidth = hostWidth / EMOJI_VISIBLE_COLS
        emojiColWidth = colWidth

        /* Gather all sections: frequent + 6 data categories */
        val allSections = mutableListOf<List<String>>()
        allSections.add(getFrequentEmojis())          // 0: frequent
        val data = getEmojiData()
        for (cat in data) allSections.add(cat)         // 1..6: data categories

        /* Build horizontal strip – every column = EMOJI_ROWS cells stacked vertically */
        val strip = LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT)
        }

        val offsets = IntArray(allSections.size)
        var curX = 0

        for ((sIdx, emojis) in allSections.withIndex()) {
            offsets[sIdx] = curX
            if (emojis.isEmpty()) continue                // skip empty (e.g. no frequent yet)

            val colCount = (emojis.size + EMOJI_ROWS - 1) / EMOJI_ROWS
            for (col in 0 until colCount) {
                val column = LinearLayout(context).apply {
                    orientation = VERTICAL
                    layoutParams = LayoutParams(colWidth, LayoutParams.MATCH_PARENT)
                }
                for (row in 0 until EMOJI_ROWS) {
                    val idx = col * EMOJI_ROWS + row
                    if (idx < emojis.size) {
                        val emoji = emojis[idx]
                        column.addView(TextView(context).apply {
                            text = emoji
                            textSize = 30f
                            gravity = Gravity.CENTER
                            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f)
                            setPadding(0, 0, 0, 0)
                            isClickable = true; isFocusable = true
                            setOnClickListener {
                                trackEmojiUsage(emoji)
                                listener?.onKeyPressed(emoji)
                            }
                        })
                    } else {
                        column.addView(View(context).apply {
                            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f)
                        })
                    }
                }
                strip.addView(column)
                curX += colWidth
            }
        }

        emojiSectionOffsets = offsets

        /* Custom scroll view with column snapping */
        val tracker = VelocityTracker.obtain()
        val scrollView = object : HorizontalScrollView(context) {

            override fun fling(velocityX: Int) { /* suppress default fling */ }

            override fun onTouchEvent(ev: MotionEvent): Boolean {
                tracker.addMovement(ev)
                if (ev.action == MotionEvent.ACTION_DOWN) {
                    emojiSnapAnimator?.cancel()       // cancel any running snap animation
                }
                val result = super.onTouchEvent(ev)
                if (ev.action == MotionEvent.ACTION_UP || ev.action == MotionEvent.ACTION_CANCEL) {
                    tracker.computeCurrentVelocity(1000, 8000f)
                    performColumnSnap(tracker.xVelocity, this)
                    tracker.clear()
                }
                return result
            }
        }.apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            isHorizontalScrollBarEnabled = false
            overScrollMode = OVER_SCROLL_IF_CONTENT_SCROLLS
        }

        scrollView.addView(strip)
        scrollView.setOnScrollChangeListener { _, sx, _, _, _ -> syncCategoryHighlight(sx) }
        emojiScrollView = scrollView
        host.addView(scrollView)

        /* Scroll to previously-selected category */
        if (selectedEmojiCategory > 0 && selectedEmojiCategory < offsets.size
                && offsets[selectedEmojiCategory] > 0) {
            scrollView.post { scrollView.scrollTo(offsets[selectedEmojiCategory], 0) }
        }
    }

    /**
     * Snap to nearest column boundary with velocity-proportional distance.
     * Small flick -> 1 col, medium -> 2-3, fast -> 4-6.
     * Uses ValueAnimator + DecelerateInterpolator for Apple-like smoothness.
     */
    private fun performColumnSnap(velocityX: Float, sv: HorizontalScrollView) {
        val cw = emojiColWidth
        if (cw <= 0) return

        val absVel = Math.abs(velocityX)
        val cols = when {
            absVel > 5000 -> 6
            absVel > 3500 -> 4
            absVel > 2000 -> 3
            absVel > 1000 -> 2
            absVel > 200  -> 1
            else          -> 0
        }

        /* Positive velocity = finger moved right = content scrolls left (decrease scrollX) */
        val dir = if (velocityX > 0) -1 else 1
        val curCol = Math.round(sv.scrollX.toFloat() / cw)
        val targetCol = if (cols > 0) curCol + dir * cols else curCol

        val totalW = sv.getChildAt(0)?.width ?: sv.width
        val maxScroll = (totalW - sv.width).coerceAtLeast(0)
        val targetX = (targetCol * cw).coerceIn(0, maxScroll)

        /* Duration scales with distance */
        val dist = Math.abs(targetX - sv.scrollX)
        val dur = when {
            dist <= 0     -> 0L
            dist < cw * 2 -> 200L
            dist < cw * 4 -> 300L
            else          -> 400L
        }
        if (dur <= 0L) return

        val startX = sv.scrollX
        emojiSnapAnimator?.cancel()
        emojiSnapAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = dur
            interpolator = DecelerateInterpolator(2.0f)
            addUpdateListener { a ->
                val f = a.animatedValue as Float
                sv.scrollTo(startX + ((targetX - startX) * f).toInt(), 0)
            }
            start()
        }
    }

    /** Highlight the category whose section is currently most visible. */
    private fun syncCategoryHighlight(scrollX: Int) {
        val offsets = emojiSectionOffsets
        if (offsets.isEmpty()) return

        var active = 0
        for (i in offsets.indices) {
            if (scrollX + emojiColWidth / 2 >= offsets[i]) active = i
        }
        if (active != selectedEmojiCategory) {
            selectedEmojiCategory = active
            for ((i, v) in emojiCategoryViews.withIndex()) {
                v.background = if (i == active) roundedBg(COL_EMOJI_CAT_SEL, dp(8).toFloat()) else null
            }
        }
    }

    /**
     * Category bar; tapping a category smoothly scrolls to it.
     */
    private fun buildEmojiCategoryBar(): LinearLayout {
        val catIcons = listOf(
            "\uD83D\uDD53",          // 0: clock (recent)
            "\uD83D\uDE00",          // 1: smileys
            "\uD83D\uDC3B",          // 2: animals
            "\uD83C\uDF4E",          // 3: food
            "\u26BD",                // 4: sports
            "\uD83D\uDE97",          // 5: travel
            "\u2764\uFE0F",          // 6: hearts/symbols
            "\uD83C\uDFF3\uFE0F"     // 7: flags
        )

        emojiCategoryViews.clear()

        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(44))
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(4), dp(4), dp(4), dp(4))

            /* ABC button to dismiss */
            addView(TextView(context).apply {
                text = if (isEnglishLayout) "ABC" else "\u0410\u0411\u0412"
                textSize = 13f
                setTextColor(COL_TEXT_SEC)
                gravity = Gravity.CENTER
                val s = dp(36)
                layoutParams = LayoutParams(s, s).apply { setMargins(dp(2), 0, dp(2), 0) }
                isClickable = true; isFocusable = true
                setOnClickListener { hideEmojiPicker() }
            })

            /* Category icons */
            val catScroll = HorizontalScrollView(context).apply {
                layoutParams = LayoutParams(0, LayoutParams.MATCH_PARENT, 1f)
                isHorizontalScrollBarEnabled = false
            }
            val catRow = LinearLayout(context).apply {
                orientation = HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                layoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT)
            }
            for ((i, icon) in catIcons.withIndex()) {
                val tv = TextView(context).apply {
                    text = icon
                    textSize = 20f
                    gravity = Gravity.CENTER
                    val sz = dp(36)
                    layoutParams = LayoutParams(sz, sz).apply { setMargins(dp(3), 0, dp(3), 0) }
                    background = if (i == selectedEmojiCategory) {
                        roundedBg(COL_EMOJI_CAT_SEL, dp(8).toFloat())
                    } else null
                    isClickable = true; isFocusable = true
                    setOnClickListener { scrollToEmojiCategory(i) }
                }
                catRow.addView(tv)
                emojiCategoryViews.add(tv)
            }
            catScroll.addView(catRow)
            addView(catScroll)

            /* Delete */
            addView(TextView(context).apply {
                text = "\u232B"
                textSize = 18f
                setTextColor(COL_TEXT_SEC)
                gravity = Gravity.CENTER
                val s = dp(36)
                layoutParams = LayoutParams(s, s).apply { setMargins(dp(2), 0, dp(2), 0) }
                isClickable = true; isFocusable = true
                setOnClickListener { listener?.onDeletePressed() }
            })
        }
    }

    /** Smoothly scroll to the given emoji category. */
    private fun scrollToEmojiCategory(catIndex: Int) {
        val sv = emojiScrollView ?: return
        if (catIndex < 0 || catIndex >= emojiSectionOffsets.size) return

        selectedEmojiCategory = catIndex
        val targetX = emojiSectionOffsets[catIndex]
        val maxScroll = ((sv.getChildAt(0)?.width ?: sv.width) - sv.width).coerceAtLeast(0)
        val clampedX = targetX.coerceIn(0, maxScroll)

        val startX = sv.scrollX
        emojiSnapAnimator?.cancel()
        emojiSnapAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 350L
            interpolator = DecelerateInterpolator(2.0f)
            addUpdateListener { a ->
                val f = a.animatedValue as Float
                sv.scrollTo(startX + ((clampedX - startX) * f).toInt(), 0)
            }
            start()
        }

        /* Update highlighting immediately */
        for ((i, v) in emojiCategoryViews.withIndex()) {
            v.background = if (i == catIndex) roundedBg(COL_EMOJI_CAT_SEL, dp(8).toFloat()) else null
        }
    }

    /* Frequently-used emoji tracking via SharedPreferences */
    private val PREFS_EMOJI = "reword_emoji_freq"
    private val MAX_RECENT = 28  // 4 rows x 7 cols

    private fun getFrequentEmojis(): List<String> {
        val prefs = context.getSharedPreferences(PREFS_EMOJI, Context.MODE_PRIVATE)
        return prefs.all.entries
            .mapNotNull { e -> (e.value as? Int)?.let { e.key to it } }
            .sortedByDescending { it.second }
            .take(MAX_RECENT)
            .map { it.first }
    }

    private fun trackEmojiUsage(emoji: String) {
        val prefs = context.getSharedPreferences(PREFS_EMOJI, Context.MODE_PRIVATE)
        val count = prefs.getInt(emoji, 0)
        prefs.edit().putInt(emoji, count + 1).apply()
    }

    /* ================================================================
       EMOJI SEARCH MODE
       ================================================================ */

    /** Enter search mode: iOS layout = search bar on top → single horizontal
     *  emoji results row → keyboard rows below. */
    private fun enterEmojiSearchMode() {
        isEmojiSearchMode = true
        emojiSearchQuery = ""

        emojiContainer?.removeAllViews()
        emojiContainer?.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(94))
        emojiContainer?.setBackgroundColor(COL_EMOJI_BG)

        /* Move emojiContainer ABOVE keyboard rows for iOS search layout */
        emojiContainer?.let { container ->
            if (indexOfChild(container) >= 0) removeView(container)
            addView(container, 1) // after toolbar (index 0, GONE)
        }

        val searchLayout = LinearLayout(context).apply {
            orientation = VERTICAL
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(COL_EMOJI_BG)
        }

        /* Search bar at top */
        searchLayout.addView(buildEmojiSearchBar())

        /* Single horizontal results row (remaining height) */
        emojiSearchResultsRow = FrameLayout(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f)
            setPadding(dp(4), 0, dp(4), 0)
            setBackgroundColor(COL_EMOJI_BG)
        }
        searchLayout.addView(emojiSearchResultsRow!!)

        emojiContainer?.addView(searchLayout)

        /* Show keyboard rows below the emoji container */
        keysSection.visibility = VISIBLE
        actionSection.visibility = VISIBLE
        bottomBar.visibility = VISIBLE

        /* Blue check button + cursor blink */
        updateEnterButtonIcon()
        startCursorBlink()
        updateEmojiSearchDisplay()
    }

    /** Exit search mode — return to full emoji picker (not base keyboard). */
    private fun exitEmojiSearchMode() {
        stopCursorBlink()
        isEmojiSearchMode = false
        emojiSearchQuery = ""
        /* Re-show full emoji picker */
        showEmojiPicker()
    }

    /* ── Cursor blink for search bar ── */
    private val cursorHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private var cursorVisible = true
    private val cursorRunnable = object : Runnable {
        override fun run() {
            if (!isEmojiSearchMode) return
            cursorVisible = !cursorVisible
            refreshSearchBarText()
            cursorHandler.postDelayed(this, 500)
        }
    }

    private fun startCursorBlink() {
        cursorVisible = true
        cursorHandler.removeCallbacks(cursorRunnable)
        cursorHandler.postDelayed(cursorRunnable, 500)
    }

    private fun stopCursorBlink() {
        cursorHandler.removeCallbacks(cursorRunnable)
        cursorVisible = false
    }

    private fun refreshSearchBarText() {
        val cursor = if (cursorVisible) "|" else " "
        if (emojiSearchQuery.isEmpty()) {
            // Show placeholder with cursor
            emojiSearchTextView?.text = "$cursor\u041F\u043E\u0438\u0441\u043A \u044D\u043C\u043E\u0434\u0437\u0438"
            emojiSearchTextView?.setTextColor(0xFF8E8E93.toInt())
        } else {
            emojiSearchTextView?.text = "${emojiSearchQuery}$cursor"
            emojiSearchTextView?.setTextColor(COL_TEXT)
        }
    }

    /** Update the search display: text view, clear button, and results.
     *  iOS style — single horizontal scrolling row of emoji. */
    private fun updateEmojiSearchDisplay() {
        refreshSearchBarText()
        cursorVisible = true
        cursorHandler.removeCallbacks(cursorRunnable)
        cursorHandler.postDelayed(cursorRunnable, 500)

        emojiSearchClearBtn?.visibility = if (emojiSearchQuery.isNotEmpty()) VISIBLE else GONE

        val resultsHost = emojiSearchResultsRow ?: return
        resultsHost.removeAllViews()

        val results = if (emojiSearchQuery.isNotBlank()) searchEmojis(emojiSearchQuery) else emptyList()
        val displayList = if (emojiSearchQuery.isEmpty()) getFrequentEmojis() else results

        if (displayList.isEmpty() && emojiSearchQuery.isNotEmpty()) {
            resultsHost.addView(TextView(context).apply {
                text = "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E"
                textSize = 14f
                setTextColor(0xFF8E8E93.toInt())
                gravity = Gravity.CENTER
                layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            })
            return
        }

        /* Single horizontal scrolling row — iOS emoji search style */
        val scroll = HorizontalScrollView(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            isHorizontalScrollBarEnabled = false
            overScrollMode = OVER_SCROLL_NEVER
            setBackgroundColor(COL_EMOJI_BG)
        }
        val row = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT)
            setPadding(dp(6), 0, dp(6), 0)
        }
        for (emoji in displayList) {
            row.addView(TextView(context).apply {
                text = emoji
                textSize = 30f
                gravity = Gravity.CENTER
                val sz = dp(44)
                layoutParams = LayoutParams(sz, sz)
                isClickable = true; isFocusable = true
                setOnClickListener {
                    trackEmojiUsage(emoji)
                    listener?.onKeyPressed(emoji)
                }
            })
        }
        scroll.addView(row)
        resultsHost.addView(scroll)
    }

    /** Update enter button icon: blue checkmark in search mode, return arrow otherwise. */
    private fun updateEnterButtonIcon() {
        enterBtn?.let { btn ->
            val iconSize = dp(22)
            val icon: android.graphics.drawable.Drawable
            if (isEmojiSearchMode) {
                icon = KeyboardIcons.checkmark(0xFFFFFFFF.toInt(), iconSize)
                btn.background = roundedBg(0xFF007AFF.toInt(), dp(5).toFloat())
            } else {
                icon = KeyboardIcons.returnArrow(COL_TEXT, iconSize)
                btn.background = roundedBg(COL_KEY, dp(5).toFloat())
            }
            icon.setBounds(0, 0, iconSize, iconSize)
            btn.foreground = object : android.graphics.drawable.Drawable() {
                override fun draw(canvas: android.graphics.Canvas) {
                    val cx = (btn.width - iconSize) / 2f
                    val cy = (btn.height - iconSize) / 2f
                    canvas.save(); canvas.translate(cx, cy)
                    icon.draw(canvas)
                    canvas.restore()
                }
                override fun setAlpha(a: Int) {}
                override fun setColorFilter(cf: android.graphics.ColorFilter?) {}
                @Suppress("OVERRIDE_DEPRECATION")
                override fun getOpacity() = android.graphics.PixelFormat.TRANSLUCENT
            }
        }
    }

    /** Search emojis by keywords — prefix match first, then contains. */
    private fun searchEmojis(query: String): List<String> {
        if (query.isBlank()) return emptyList()
        val q = query.lowercase().trim()
        val keywords = getEmojiKeywords()
        val startsWith = mutableListOf<String>()
        val contains = mutableListOf<String>()
        for ((emoji, kws) in keywords) {
            if (kws.any { it.startsWith(q) }) startsWith.add(emoji)
            else if (kws.any { it.contains(q) }) contains.add(emoji)
        }
        return startsWith + contains
    }

    /** Comprehensive Russian + English keywords for every emoji in the built-in set. */
    private fun getEmojiKeywords(): Map<String, List<String>> {
        val m = mutableMapOf<String, List<String>>()
        // ── Smileys & People ──
        m["\uD83D\uDE00"] = listOf("улыбка","смех","радость","веселье","smile","grin","happy","joy")
        m["\uD83D\uDE06"] = listOf("смех","хаха","ржу","веселье","laugh","haha","lol")
        m["\uD83E\uDD23"] = listOf("ржу","слёзы","смех","катаюсь","rofl","lol","tears","laugh")
        m["\uD83D\uDE07"] = listOf("ангел","нимб","невинный","добрый","angel","halo","innocent")
        m["\uD83D\uDE0A"] = listOf("улыбка","румянец","щёки","счастье","smile","blush","happy","shy")
        m["\uD83D\uDE0F"] = listOf("ухмылка","хитрый","самоуверенный","smirk","sly","cocky")
        m["\uD83D\uDE18"] = listOf("поцелуй","целую","воздушный","kiss","love","smooch","muah")
        m["\uD83D\uDE1B"] = listOf("язык","дразнить","шутка","tongue","playful","silly","tease")
        m["\uD83D\uDE04"] = listOf("улыбка","глаза","радость","счастье","smile","eyes","happy","grin")
        m["\uD83D\uDE05"] = listOf("пот","нервный","неловко","smile","sweat","nervous","awkward")
        m["\uD83D\uDE02"] = listOf("слёзы","смех","радость","ржу","joy","tears","laugh","lol","funny")
        m["\u263A\uFE0F"] = listOf("улыбка","тёплая","спокойствие","smile","relaxed","warm","classic")
        m["\uD83D\uDE0C"] = listOf("облегчение","спокойствие","мир","relieved","peaceful","calm","zen")
        m["\uD83D\uDE0D"] = listOf("любовь","сердца","глаза","влюблён","heart","eyes","love","crush","adore")
        m["\uD83D\uDE17"] = listOf("поцелуй","целую","губы","kiss","peck","lips")
        m["\uD83D\uDE1C"] = listOf("подмигивание","язык","шалость","wink","tongue","silly","playful")
        m["\uD83D\uDE03"] = listOf("улыбка","рот","открытый","весёлый","smile","open","happy","cheerful")
        m["\uD83E\uDD72"] = listOf("плач","улыбка","слеза","грусть","smile","tear","bittersweet","sad")
        m["\uD83D\uDE42"] = listOf("улыбка","слегка","slight","smile","mild","ok")
        m["\uD83E\uDD17"] = listOf("обнимашки","обнять","тепло","hug","hugging","warm","embrace")
        m["\uD83D\uDE09"] = listOf("подмигивание","хитрый","намёк","wink","sly","hint")
        m["\uD83E\uDD70"] = listOf("любовь","сердца","обожание","нежность","love","hearts","adore","sweet")
        m["\uD83D\uDE19"] = listOf("поцелуй","целую","kiss","smooch","peck")
        m["\uD83E\uDD2A"] = listOf("сумасшедший","безумный","дурачок","crazy","zany","wild","goofy")
        m["\uD83D\uDE01"] = listOf("радость","улыбка","зубы","grin","beam","teeth","happy")
        m["\uD83D\uDE22"] = listOf("грустный","плач","слеза","печаль","cry","sad","tear","upset")
        m["\uD83D\uDE43"] = listOf("вверх ногами","ирония","сарказм","upside","down","irony","sarcasm")
        m["\uD83E\uDD2D"] = listOf("тайна","ой","рот","хихи","secret","oops","giggle","tee-hee")
        m["\uD83D\uDE0B"] = listOf("вкусно","язык","ням","еда","yummy","delicious","tongue","tasty")
        m["\uD83D\uDE3B"] = listOf("кот","любовь","сердца","cat","heart","love","kitten")
        m["\uD83E\uDD73"] = listOf("праздник","вечеринка","день рождения","party","celebrate","birthday")
        m["\uD83E\uDD28"] = listOf("подозрение","бровь","скептик","hmm","suspicious","eyebrow","skeptic")
        m["\uD83E\uDD13"] = listOf("ботан","очки","умный","nerd","glasses","smart","geek")
        m["\uD83D\uDE24"] = listOf("злость","пар","триумф","бесит","angry","triumph","steam","mad")
        m["\uD83E\uDD25"] = listOf("ложь","врун","нос","pinocchio","lie","liar","nose")
        m["\uD83E\uDD78"] = listOf("маскировка","инкогнито","шпион","disguise","incognito","spy")
        m["\uD83D\uDE08"] = listOf("дьявол","рожки","зло","шалость","devil","imp","evil","naughty")
        m["\uD83D\uDC7F"] = listOf("злой","демон","дьявол","angry","demon","devil","mean")
        m["\uD83D\uDC80"] = listOf("череп","смерть","мертвец","skull","death","dead","skeleton")
        m["\u2620\uFE0F"] = listOf("череп","кости","пират","опасность","skull","crossbones","pirate","danger")
        m["\uD83D\uDCA9"] = listOf("какашка","фу","пу","poop","shit","crap","turd")
        m["\uD83E\uDD21"] = listOf("клоун","цирк","шут","clown","circus","joker")
        m["\uD83D\uDC79"] = listOf("монстр","огр","страшный","чудовище","ogre","monster","scary")
        m["\uD83D\uDC7A"] = listOf("гоблин","тролль","злой","goblin","troll","tengu")
        m["\uD83D\uDC7B"] = listOf("привидение","призрак","бу","ghost","boo","spooky","halloween")
        m["\uD83D\uDC7D"] = listOf("инопланетянин","пришелец","нло","alien","ufo","space")
        m["\uD83D\uDC7E"] = listOf("монстр","игра","аркада","пришелец","alien","game","arcade","pixel")
        m["\uD83E\uDD16"] = listOf("робот","бот","машина","robot","bot","android","ai")
        m["\uD83D\uDE3A"] = listOf("кот","улыбка","мяу","cat","smile","grin","meow")
        m["\uD83D\uDE38"] = listOf("кот","слёзы","смех","cat","joy","tears","laugh")
        m["\uD83D\uDE39"] = listOf("кот","смех","ржёт","cat","tears","joy","rofl")
        m["\uD83D\uDE3C"] = listOf("кот","ухмылка","хитрый","cat","smirk","sly","wry")
        m["\uD83D\uDE3D"] = listOf("кот","поцелуй","целует","cat","kiss","smooch")
        m["\uD83D\uDE40"] = listOf("кот","испуг","шок","cat","weary","scared","shock")
        m["\uD83D\uDE3F"] = listOf("кот","грустный","плачет","cat","cry","sad","tear")
        m["\uD83D\uDE3E"] = listOf("кот","злой","сердитый","cat","angry","grumpy","mad")
        m["\uD83D\uDE48"] = listOf("обезьяна","глаза","не вижу","monkey","see","no","evil")
        m["\uD83D\uDE49"] = listOf("обезьяна","уши","не слышу","monkey","hear","no","evil")
        m["\uD83D\uDE4A"] = listOf("обезьяна","рот","молчу","monkey","speak","no","evil")
        // ── Hands & Gestures ──
        m["\uD83D\uDC4B"] = listOf("привет","рука","пока","махать","wave","hand","hi","hello","bye")
        m["\uD83E\uDD1A"] = listOf("рука","ладонь","стоп","hand","palm","raised","back")
        m["\u270B"] = listOf("рука","стоп","пять","hand","stop","high five","raised")
        m["\uD83D\uDD96"] = listOf("вулкан","спок","trek","spock","vulcan","prosper")
        m["\uD83D\uDC4C"] = listOf("ок","хорошо","отлично","ok","good","fine","perfect","nice")
        m["\uD83E\uDD0F"] = listOf("щепотка","мало","чуть","pinch","small","tiny","little")
        m["\u270C\uFE0F"] = listOf("победа","мир","виктория","два","victory","peace","v","two")
        m["\uD83E\uDD1E"] = listOf("удача","пальцы","скрещенные","luck","fingers","crossed","hope")
        m["\uD83E\uDD1F"] = listOf("любовь","рука","жест","love","hand","sign","ily")
        m["\uD83E\uDD18"] = listOf("рок","рога","метал","rock","horns","metal","devil")
        m["\uD83E\uDD19"] = listOf("позвони","шака","прибой","call","shaka","hang loose","surf")
        m["\uD83D\uDC48"] = listOf("влево","палец","указатель","left","point","back","arrow")
        m["\uD83D\uDC49"] = listOf("вправо","палец","указатель","right","point","forward","arrow")
        m["\uD83D\uDC46"] = listOf("вверх","палец","указатель","up","point","above","top")
        m["\uD83D\uDC47"] = listOf("вниз","палец","указатель","down","point","below","bottom")
        m["\u261D\uFE0F"] = listOf("вверх","указатель","палец","внимание","up","index","point","attention")
        m["\uD83D\uDC4D"] = listOf("класс","лайк","палец вверх","хорошо","thumb","up","like","yes","good")
        m["\uD83D\uDC4E"] = listOf("плохо","дизлайк","палец вниз","нет","thumb","down","dislike","bad","no")
        m["\u270A"] = listOf("кулак","сила","борьба","fist","power","fight","punch")
        m["\uD83D\uDC4A"] = listOf("удар","кулак","бум","punch","fist","hit","boom","pow")
        m["\uD83E\uDD1B"] = listOf("кулак","влево","бро","fist","left","bump")
        m["\uD83E\uDD1C"] = listOf("кулак","вправо","бро","fist","right","bump")
        m["\uD83D\uDC4F"] = listOf("аплодисменты","хлопать","браво","clap","applause","bravo","congratulations")
        m["\uD83D\uDE4C"] = listOf("руки","ура","празднование","поднятые","raised","hands","celebrate","hooray")
        m["\uD83D\uDC50"] = listOf("руки","ладони","открытые","open","hands","palms")
        m["\uD83E\uDD32"] = listOf("ладони","вверх","просьба","palms","up","prayer","give")
        m["\uD83E\uDD1D"] = listOf("рукопожатие","сделка","договор","handshake","deal","agreement","hello")
        m["\uD83D\uDE4F"] = listOf("молитва","спасибо","пожалуйста","pray","thanks","please","namaste","hope")
        // ── Animals ──
        m["\uD83D\uDC36"] = listOf("собака","пёс","щенок","гав","dog","puppy","pet","woof","bark")
        m["\uD83D\uDC31"] = listOf("кот","кошка","котёнок","мяу","cat","kitten","pet","meow","kitty")
        m["\uD83D\uDC2D"] = listOf("мышь","мышка","грызун","mouse","mice","rodent","squeak")
        m["\uD83D\uDC39"] = listOf("хомяк","хомячок","грызун","hamster","pet","rodent","cute")
        m["\uD83D\uDC30"] = listOf("кролик","заяц","зайчик","rabbit","bunny","hare","cute","easter")
        m["\uD83E\uDD8A"] = listOf("лиса","лисица","хитрая","fox","foxy","cunning","clever")
        m["\uD83D\uDC3B"] = listOf("медведь","мишка","бурый","bear","teddy","grizzly","brown")
        m["\uD83D\uDC3C"] = listOf("панда","бамбук","чёрно-белый","panda","bamboo","china","cute")
        m["\uD83D\uDC28"] = listOf("коала","австралия","мишка","koala","australia","cute","eucalyptus")
        m["\uD83D\uDC2F"] = listOf("тигр","полосатый","хищник","tiger","stripes","predator","cat")
        m["\uD83E\uDD81"] = listOf("лев","царь","грива","lion","king","mane","pride")
        m["\uD83D\uDC2E"] = listOf("корова","бурёнка","молоко","cow","milk","moo","farm")
        m["\uD83D\uDC37"] = listOf("свинья","поросёнок","хрю","pig","piggy","oink","farm")
        m["\uD83D\uDC38"] = listOf("лягушка","жаба","ква","frog","toad","ribbit","green")
        m["\uD83D\uDC35"] = listOf("обезьяна","мартышка","примат","monkey","ape","primate","chimp")
        m["\uD83D\uDC12"] = listOf("обезьяна","макака","примат","monkey","ape","primate","banana")
        m["\uD83D\uDC14"] = listOf("курица","петух","несушка","chicken","hen","rooster","farm","poultry")
        m["\uD83D\uDC27"] = listOf("пингвин","антарктида","лёд","penguin","antarctica","ice","cold","tux")
        m["\uD83D\uDC26"] = listOf("птица","птичка","пташка","bird","tweet","chirp","fly")
        m["\uD83D\uDC24"] = listOf("цыплёнок","птенец","маленький","chick","baby","chicken","small")
        m["\uD83D\uDC23"] = listOf("цыплёнок","яйцо","вылупился","chick","egg","hatching","baby")
        m["\uD83D\uDC25"] = listOf("цыплёнок","птенец","малыш","chick","baby","front","cute")
        m["\uD83E\uDD86"] = listOf("утка","уточка","кря","duck","quack","waddle","pond")
        m["\uD83E\uDD85"] = listOf("орёл","птица","хищник","eagle","hawk","bird","predator","usa")
        m["\uD83E\uDD89"] = listOf("сова","мудрая","ночь","owl","wise","night","hoot")
        m["\uD83E\uDD87"] = listOf("летучая мышь","вампир","ночь","bat","vampire","night","halloween")
        m["\uD83D\uDC3A"] = listOf("волк","серый","хищник","wolf","grey","howl","wild")
        m["\uD83D\uDC17"] = listOf("кабан","дикий","вепрь","boar","wild","pig","hog")
        m["\uD83D\uDC34"] = listOf("лошадь","конь","скакун","horse","stallion","mare","equestrian")
        m["\uD83E\uDD84"] = listOf("единорог","волшебный","рог","unicorn","magic","fantasy","horn","rainbow")
        m["\uD83D\uDC1D"] = listOf("пчела","мёд","жужжит","bee","honey","buzz","sting","bumblebee")
        m["\uD83E\uDD8B"] = listOf("бабочка","мотылёк","красивая","butterfly","moth","wings","pretty")
        m["\uD83D\uDC0C"] = listOf("улитка","медленно","ракушка","snail","slow","shell","sluggish")
        m["\uD83D\uDC1E"] = listOf("жук","божья коровка","насекомое","bug","ladybug","beetle","insect")
        m["\uD83D\uDC1C"] = listOf("муравей","насекомое","трудяга","ant","insect","colony","worker")
        m["\uD83D\uDC22"] = listOf("черепаха","медленно","панцирь","turtle","tortoise","slow","shell")
        m["\uD83D\uDC0D"] = listOf("змея","гадюка","ползучий","snake","serpent","viper","slither")
        m["\uD83E\uDD8E"] = listOf("ящерица","рептилия","хамелеон","lizard","reptile","chameleon","gecko")
        m["\uD83E\uDD96"] = listOf("динозавр","тирекс","хищник","dinosaur","trex","tyrannosaurus","jurassic")
        m["\uD83E\uDD95"] = listOf("динозавр","бронтозавр","длинношей","dinosaur","sauropod","brontosaurus","dino")
        m["\uD83D\uDC19"] = listOf("осьминог","щупальца","море","octopus","tentacles","sea","ocean")
        m["\uD83E\uDD91"] = listOf("кальмар","щупальца","море","squid","tentacles","sea","ocean")
        m["\uD83E\uDD80"] = listOf("краб","клешни","море","crab","claws","sea","beach","crustacean")
        m["\uD83D\uDC21"] = listOf("рыба","тропическая","аквариум","fish","tropical","aquarium","nemo")
        m["\uD83D\uDC20"] = listOf("рыба","тропическая","цветная","fish","tropical","colorful","exotic")
        m["\uD83D\uDC1F"] = listOf("рыба","рыбка","морская","fish","small","sea","ocean")
        m["\uD83D\uDC2C"] = listOf("дельфин","море","умный","dolphin","sea","ocean","smart","flipper")
        m["\uD83D\uDC33"] = listOf("кит","океан","большой","whale","ocean","sea","blow","huge")
        // ── Food & Drink ──
        m["\uD83C\uDF4E"] = listOf("яблоко","красное","фрукт","apple","red","fruit","healthy")
        m["\uD83C\uDF50"] = listOf("груша","фрукт","зелёная","pear","fruit","green")
        m["\uD83C\uDF4A"] = listOf("апельсин","мандарин","цитрус","orange","tangerine","citrus","fruit")
        m["\uD83C\uDF4B"] = listOf("лимон","кислый","цитрус","жёлтый","lemon","sour","citrus","yellow")
        m["\uD83C\uDF4C"] = listOf("банан","жёлтый","фрукт","banana","yellow","fruit","monkey")
        m["\uD83C\uDF49"] = listOf("арбуз","лето","сочный","ягода","watermelon","summer","juicy","melon")
        m["\uD83C\uDF47"] = listOf("виноград","вино","гроздь","grapes","wine","bunch","fruit","purple")
        m["\uD83C\uDF53"] = listOf("клубника","ягода","красная","strawberry","berry","red","sweet")
        m["\uD83C\uDF48"] = listOf("дыня","фрукт","сладкая","melon","honeydew","fruit","sweet")
        m["\uD83C\uDF52"] = listOf("вишня","черешня","ягода","cherry","berries","red","fruit")
        m["\uD83C\uDF51"] = listOf("персик","фрукт","сочный","peach","fruit","juicy","soft")
        m["\uD83C\uDF4D"] = listOf("ананас","тропический","фрукт","pineapple","tropical","fruit","exotic")
        m["\uD83E\uDD5D"] = listOf("киви","зелёный","фрукт","kiwi","green","fruit","newzealand")
        m["\uD83C\uDF45"] = listOf("помидор","томат","красный","овощ","tomato","red","vegetable","salad")
        m["\uD83E\uDD51"] = listOf("авокадо","зелёный","полезный","avocado","green","healthy","guacamole")
        m["\uD83C\uDF46"] = listOf("баклажан","фиолетовый","овощ","eggplant","aubergine","purple","vegetable")
        m["\uD83E\uDD52"] = listOf("огурец","зелёный","овощ","свежий","cucumber","green","vegetable","fresh")
        m["\uD83E\uDD66"] = listOf("брокколи","зелёный","полезный","овощ","broccoli","green","healthy","vegetable")
        m["\uD83C\uDF44"] = listOf("гриб","грибок","лес","mushroom","fungus","forest","toadstool")
        m["\uD83C\uDF5E"] = listOf("хлеб","буханка","выпечка","bread","loaf","bakery","toast")
        m["\uD83E\uDD50"] = listOf("круассан","выпечка","франция","завтрак","croissant","pastry","france","breakfast")
        m["\uD83E\uDD56"] = listOf("багет","хлеб","французский","baguette","bread","french","long")
        m["\uD83E\uDDC0"] = listOf("сыр","жёлтый","молочный","cheese","yellow","dairy","swiss")
        m["\uD83C\uDF56"] = listOf("мясо","кость","стейк","meat","bone","steak","chop")
        m["\uD83C\uDF57"] = listOf("курица","ножка","птица","poultry","leg","drumstick","chicken")
        m["\uD83E\uDD69"] = listOf("стейк","мясо","говядина","жареный","steak","meat","beef","rare")
        m["\uD83C\uDF54"] = listOf("бургер","гамбургер","фастфуд","burger","hamburger","fastfood","mcdonalds")
        m["\uD83C\uDF5F"] = listOf("картошка","фри","жареная","fries","french","potato","chips")
        m["\uD83C\uDF55"] = listOf("пицца","итальянская","сыр","pizza","cheese","italian","slice")
        m["\uD83C\uDF2D"] = listOf("хотдог","сосиска","булка","hotdog","sausage","frankfurter","bun")
        m["\uD83E\uDD6A"] = listOf("сэндвич","бутерброд","хлеб","sandwich","sub","bread","lunch")
        m["\uD83C\uDF2E"] = listOf("тако","мексика","лепёшка","taco","mexican","tortilla","shell")
        m["\uD83C\uDF2F"] = listOf("буррито","мексика","рулет","burrito","mexican","wrap","bean")
        m["\uD83E\uDD59"] = listOf("лаваш","шаурма","обёртка","wrap","pita","shawarma","flatbread")
        m["\uD83C\uDF73"] = listOf("яйцо","яичница","завтрак","готовка","egg","cooking","breakfast","frying")
        m["\uD83E\uDD58"] = listOf("рагу","каша","горшок","тушить","pot","stew","casserole","cook")
        m["\uD83C\uDF72"] = listOf("суп","бульон","горячий","миска","soup","bowl","hot","broth")
        m["\uD83E\uDD63"] = listOf("миска","боул","салат","каша","bowl","salad","acai","smoothie")
        m["\uD83E\uDD57"] = listOf("салат","зелёный","свежий","овощной","salad","green","fresh","healthy")
        m["\uD83C\uDF7F"] = listOf("попкорн","кино","снэк","popcorn","movie","cinema","snack")
        // ── Sports ──
        m["\u26BD"] = listOf("футбол","мяч","гол","спорт","soccer","football","ball","goal","sport")
        m["\uD83C\uDFC0"] = listOf("баскетбол","мяч","корзина","basketball","ball","hoop","nba","sport")
        m["\uD83C\uDFC8"] = listOf("американский футбол","мяч","овальный","football","american","nfl","sport")
        m["\u26BE"] = listOf("бейсбол","мяч","бита","baseball","ball","bat","mlb","sport")
        m["\uD83C\uDFBE"] = listOf("теннис","мяч","ракетка","tennis","ball","racket","sport")
        m["\uD83C\uDFD0"] = listOf("волейбол","мяч","сетка","volleyball","ball","net","beach","sport")
        m["\uD83C\uDFC9"] = listOf("регби","мяч","овальный","rugby","ball","sport","tackle")
        m["\uD83C\uDFB1"] = listOf("бильярд","пул","шар","pool","billiards","ball","8ball","cue")
        m["\uD83C\uDFD3"] = listOf("пинг-понг","настольный теннис","ракетка","ping-pong","table tennis","paddle")
        m["\uD83C\uDFF8"] = listOf("бадминтон","волан","ракетка","badminton","shuttlecock","racket")
        m["\uD83C\uDFD2"] = listOf("хоккей","шайба","клюшка","лёд","hockey","puck","stick","ice")
        m["\uD83C\uDFCF"] = listOf("крикет","бита","cricket","bat","ball","sport")
        m["\u26F3"] = listOf("гольф","лунка","клюшка","golf","hole","club","green")
        m["\uD83C\uDFF9"] = listOf("лук","стрельба","стрела","bow","arrow","archery","target")
        m["\uD83C\uDFA3"] = listOf("рыбалка","удочка","рыба","fishing","rod","fish","catch")
        m["\uD83E\uDD4A"] = listOf("бокс","перчатка","удар","boxing","glove","punch","fight")
        m["\uD83E\uDD4B"] = listOf("боевые искусства","карате","пояс","martial arts","karate","belt","judo")
        m["\uD83C\uDFBD"] = listOf("лакросс","клюшка","мяч","lacrosse","stick","sport")
        m["\uD83C\uDFBF"] = listOf("лыжи","зима","горы","снег","ski","skiing","winter","snow","mountain")
        m["\uD83C\uDFC2"] = listOf("сноуборд","зима","доска","снег","snowboard","winter","snow","board")
        m["\uD83C\uDFC4"] = listOf("сёрфинг","волна","доска","океан","surfing","wave","board","ocean","beach")
        m["\uD83C\uDFCA"] = listOf("плавание","пловец","бассейн","вода","swimming","swimmer","pool","water")
        m["\uD83E\uDD3D"] = listOf("водное поло","бассейн","мяч","water polo","pool","ball","swimming")
        m["\uD83D\uDEB4"] = listOf("велосипед","велик","педали","cycling","bike","bicycle","ride","pedal")
        // ── Travel & Transport ──
        m["\uD83D\uDE97"] = listOf("машина","авто","автомобиль","car","auto","vehicle","drive","red")
        m["\uD83D\uDE95"] = listOf("такси","жёлтый","поездка","taxi","cab","yellow","ride","uber")
        m["\uD83D\uDE99"] = listOf("внедорожник","джип","suv","jeep","offroad","4x4")
        m["\uD83D\uDE8C"] = listOf("автобус","общественный","транспорт","bus","public","transit","city")
        m["\uD83D\uDE93"] = listOf("полиция","машина","мигалка","police","car","patrol","cop","siren")
        m["\uD83D\uDE91"] = listOf("скорая","помощь","медицина","ambulance","emergency","medical","hospital")
        m["\uD83D\uDE92"] = listOf("пожарная","машина","огонь","fire","truck","engine","firefighter","red")
        m["\uD83D\uDE9A"] = listOf("грузовик","доставка","фура","truck","delivery","cargo","moving")
        m["\uD83D\uDE9B"] = listOf("фура","грузовик","большой","truck","semi","trailer","cargo","big")
        m["\uD83D\uDE9C"] = listOf("трактор","ферма","поле","tractor","farm","field","agriculture")
        m["\uD83D\uDEB2"] = listOf("велосипед","велик","двухколёсный","bicycle","bike","cycling","pedal")
        m["\uD83D\uDE94"] = listOf("полиция","патруль","сирена","police","patrol","cop","oncoming")
        m["\uD83D\uDE8D"] = listOf("автобус","троллейбус","транспорт","bus","transit","oncoming")
        m["\uD83D\uDE98"] = listOf("машина","авто","sedan","car","vehicle","oncoming")
        m["\uD83D\uDE84"] = listOf("поезд","скорый","синкансен","bullet","train","shinkansen","fast","japan")
        m["\uD83D\uDE85"] = listOf("поезд","скоростной","экспресс","bullet","train","high-speed","express")
        m["\uD83D\uDE82"] = listOf("поезд","паровоз","вагон","locomotive","train","steam","railway")
        m["\uD83D\uDE86"] = listOf("поезд","электричка","рельсы","train","railway","rail","commuter")
        m["\uD83D\uDE87"] = listOf("метро","подземка","subway","metro","underground","tube","transport")
        m["\uD83D\uDE89"] = listOf("станция","вокзал","платформа","station","platform","railway","terminal")
        m["\u2708\uFE0F"] = listOf("самолёт","полёт","путешествие","airplane","plane","flight","travel","fly")
        m["\uD83D\uDEEB"] = listOf("самолёт","взлёт","вылет","airplane","departure","takeoff","travel")
        m["\uD83D\uDE80"] = listOf("ракета","космос","запуск","скорость","rocket","space","launch","fast","nasa")
        m["\uD83D\uDE81"] = listOf("вертолёт","полёт","helicopter","chopper","flight","copter")
        // ── Hearts & Symbols ──
        m["\u2764\uFE0F"] = listOf("сердце","красное","любовь","heart","red","love","valentine")
        m["\uD83E\uDDE1"] = listOf("сердце","оранжевое","тёплое","heart","orange","warm")
        m["\uD83D\uDC9B"] = listOf("сердце","жёлтое","дружба","heart","yellow","friendship")
        m["\uD83D\uDC9A"] = listOf("сердце","зелёное","здоровье","heart","green","health","nature")
        m["\uD83D\uDC99"] = listOf("сердце","синее","спокойствие","heart","blue","trust","calm")
        m["\uD83D\uDC9C"] = listOf("сердце","фиолетовое","творчество","heart","purple","creative")
        m["\uD83D\uDDA4"] = listOf("сердце","чёрное","тёмное","грусть","heart","black","dark","goth")
        m["\uD83E\uDD0D"] = listOf("сердце","белое","чистое","мир","heart","white","pure","peace")
        m["\uD83E\uDD0E"] = listOf("сердце","коричневое","тепло","heart","brown","warm","earth")
        m["\uD83D\uDC94"] = listOf("сердце","разбитое","расставание","грусть","broken","heart","sad","breakup")
        m["\u2763\uFE0F"] = listOf("сердце","восклицание","важно","heart","exclamation","important")
        m["\uD83D\uDC95"] = listOf("сердца","два","пара","hearts","two","couple","love")
        m["\uD83D\uDC9E"] = listOf("сердца","вращающиеся","любовь","revolving","hearts","love","spinning")
        m["\uD83D\uDC93"] = listOf("сердце","бьющееся","пульс","heartbeat","beating","pulse","alive")
        m["\uD83D\uDC97"] = listOf("сердце","растущее","увеличение","growing","heart","bigger","love")
        m["\uD83D\uDC96"] = listOf("сердце","искры","блестящее","sparkling","heart","sparkle","shine")
        m["\uD83D\uDC9D"] = listOf("сердце","лента","подарок","ribbon","heart","gift","bow")
        m["\uD83D\uDC98"] = listOf("сердце","стрела","купидон","arrow","cupid","heart","love","valentine")
        m["\uD83D\uDC8C"] = listOf("письмо","любовь","конверт","love","letter","envelope","mail","valentine")
        m["\uD83D\uDD34"] = listOf("круг","красный","точка","circle","red","dot","ball")
        m["\uD83D\uDFE0"] = listOf("круг","оранжевый","точка","circle","orange","dot")
        m["\uD83D\uDFE1"] = listOf("круг","жёлтый","точка","circle","yellow","dot")
        m["\uD83D\uDFE2"] = listOf("круг","зелёный","точка","circle","green","dot")
        m["\uD83D\uDD35"] = listOf("круг","синий","точка","circle","blue","dot")
        m["\uD83D\uDFE3"] = listOf("круг","фиолетовый","точка","circle","purple","dot")
        m["\u26AB"] = listOf("круг","чёрный","точка","circle","black","dot")
        m["\u26AA"] = listOf("круг","белый","точка","circle","white","dot")
        m["\uD83D\uDFE4"] = listOf("круг","коричневый","точка","circle","brown","dot")
        m["\uD83D\uDD3A"] = listOf("треугольник","красный","вверх","опасность","triangle","red","up","warning")
        m["\uD83D\uDD3B"] = listOf("треугольник","красный","вниз","triangle","red","down")
        m["\uD83D\uDD38"] = listOf("ромб","оранжевый","маленький","diamond","small","orange")
        m["\uD83D\uDD39"] = listOf("ромб","синий","маленький","diamond","small","blue")
        // ── Flags ──
        m["\uD83C\uDDF7\uD83C\uDDFA"] = listOf("россия","ру","флаг","russia","ru","flag","russian","москва","moscow")
        m["\uD83C\uDDFA\uD83C\uDDF8"] = listOf("сша","америка","флаг","usa","us","america","flag","american","states")
        m["\uD83C\uDDEC\uD83C\uDDE7"] = listOf("великобритания","англия","британия","флаг","uk","gb","britain","england","flag","british")
        m["\uD83C\uDDE9\uD83C\uDDEA"] = listOf("германия","немецкий","флаг","germany","de","flag","german","deutsch","berlin")
        m["\uD83C\uDDEB\uD83C\uDDF7"] = listOf("франция","французский","флаг","france","fr","flag","french","paris")
        m["\uD83C\uDDEE\uD83C\uDDF9"] = listOf("италия","итальянский","флаг","italy","it","flag","italian","rome","roma")
        m["\uD83C\uDDEA\uD83C\uDDF8"] = listOf("испания","испанский","флаг","spain","es","flag","spanish","madrid")
        m["\uD83C\uDDF5\uD83C\uDDF9"] = listOf("португалия","португальский","флаг","portugal","pt","flag","portuguese","lisbon")
        m["\uD83C\uDDE7\uD83C\uDDF7"] = listOf("бразилия","бразильский","флаг","brazil","br","flag","brazilian","rio")
        m["\uD83C\uDDE8\uD83C\uDDF3"] = listOf("китай","китайский","флаг","china","cn","flag","chinese","beijing")
        m["\uD83C\uDDEF\uD83C\uDDF5"] = listOf("япония","японский","флаг","japan","jp","flag","japanese","tokyo")
        m["\uD83C\uDDF0\uD83C\uDDF7"] = listOf("корея","южная","корейский","флаг","korea","kr","south","flag","korean","seoul")
        m["\uD83C\uDDEE\uD83C\uDDF3"] = listOf("индия","индийский","флаг","india","in","flag","indian","delhi")
        m["\uD83C\uDDE6\uD83C\uDDEA"] = listOf("оаэ","эмираты","дубай","флаг","uae","emirates","dubai","flag","arab")
        m["\uD83C\uDDF9\uD83C\uDDF7"] = listOf("турция","турецкий","флаг","turkey","tr","flag","turkish","istanbul","ankara")
        m["\uD83C\uDDFA\uD83C\uDDE6"] = listOf("украина","украинский","флаг","ukraine","ua","flag","ukrainian","kyiv","kiev")
        m["\uD83C\uDDE7\uD83C\uDDFE"] = listOf("беларусь","белорусский","флаг","belarus","by","flag","belarusian","minsk")
        m["\uD83C\uDDF0\uD83C\uDDFF"] = listOf("казахстан","казахский","флаг","kazakhstan","kz","flag","kazakh","astana")
        m["\uD83C\uDDFA\uD83C\uDDFF"] = listOf("узбекистан","узбекский","флаг","uzbekistan","uz","flag","uzbek","tashkent")
        m["\uD83C\uDDEC\uD83C\uDDEA"] = listOf("грузия","грузинский","флаг","georgia","ge","flag","georgian","tbilisi")
        m["\uD83C\uDDE6\uD83C\uDDF2"] = listOf("армения","армянский","флаг","armenia","am","flag","armenian","yerevan")
        m["\uD83C\uDDE6\uD83C\uDDFF"] = listOf("азербайджан","азербайджанский","флаг","azerbaijan","az","flag","baku")
        m["\uD83C\uDDF5\uD83C\uDDF1"] = listOf("польша","польский","флаг","poland","pl","flag","polish","warsaw")
        m["\uD83C\uDDE8\uD83C\uDDE6"] = listOf("канада","канадский","флаг","canada","ca","flag","canadian","ottawa","maple")
        m["\uD83C\uDDE6\uD83C\uDDFA"] = listOf("австралия","австралийский","флаг","australia","au","flag","australian","sydney")
        m["\uD83C\uDDF2\uD83C\uDDFD"] = listOf("мексика","мексиканский","флаг","mexico","mx","flag","mexican")
        m["\uD83C\uDDE6\uD83C\uDDF7"] = listOf("аргентина","аргентинский","флаг","argentina","ar","flag","argentine","buenos aires")
        m["\uD83C\uDDEE\uD83C\uDDF1"] = listOf("израиль","израильский","флаг","israel","il","flag","israeli","jerusalem")
        m["\uD83C\uDDF8\uD83C\uDDE6"] = listOf("саудовская аравия","саудиты","флаг","saudi","arabia","sa","flag","riyadh")
        m["\uD83C\uDDEA\uD83C\uDDEC"] = listOf("египет","египетский","флаг","egypt","eg","flag","egyptian","cairo")
        m["\uD83C\uDDF9\uD83C\uDDED"] = listOf("таиланд","тайский","флаг","thailand","th","flag","thai","bangkok")
        m["\uD83C\uDDFB\uD83C\uDDF3"] = listOf("вьетнам","вьетнамский","флаг","vietnam","vn","flag","vietnamese","hanoi")
        m["\uD83C\uDDF3\uD83C\uDDF1"] = listOf("нидерланды","голландия","нидерландский","флаг","netherlands","nl","holland","dutch","flag","amsterdam")
        m["\uD83C\uDDE7\uD83C\uDDEA"] = listOf("бельгия","бельгийский","флаг","belgium","be","flag","belgian","brussels")
        m["\uD83C\uDDE8\uD83C\uDDED"] = listOf("швейцария","швейцарский","флаг","switzerland","ch","flag","swiss","zurich","bern")
        m["\uD83C\uDDE6\uD83C\uDDF9"] = listOf("австрия","австрийский","флаг","austria","at","flag","austrian","vienna","wien")
        m["\uD83C\uDDF8\uD83C\uDDEA"] = listOf("швеция","шведский","флаг","sweden","se","flag","swedish","stockholm")
        m["\uD83C\uDDF3\uD83C\uDDF4"] = listOf("норвегия","норвежский","флаг","norway","no","flag","norwegian","oslo")
        m["\uD83C\uDDE9\uD83C\uDDF0"] = listOf("дания","датский","флаг","denmark","dk","flag","danish","copenhagen")
        m["\uD83C\uDDEB\uD83C\uDDEE"] = listOf("финляндия","финский","флаг","finland","fi","flag","finnish","helsinki")
        m["\uD83C\uDDEE\uD83C\uDDE9"] = listOf("индонезия","индонезийский","флаг","indonesia","id","flag","indonesian","jakarta")
        m["\uD83C\uDDF3\uD83C\uDDFF"] = listOf("новая зеландия","новозеландский","флаг","new zealand","nz","flag","kiwi","wellington")
        m["\uD83C\uDDEC\uD83C\uDDF7"] = listOf("греция","греческий","флаг","greece","gr","flag","greek","athens")
        m["\uD83C\uDDE8\uD83C\uDDFF"] = listOf("чехия","чешский","флаг","czechia","czech","cz","flag","prague")
        m["\uD83C\uDDF7\uD83C\uDDF4"] = listOf("румыния","румынский","флаг","romania","ro","flag","romanian","bucharest")
        m["\uD83C\uDDED\uD83C\uDDFA"] = listOf("венгрия","венгерский","флаг","hungary","hu","flag","hungarian","budapest")
        m["\uD83C\uDDEE\uD83C\uDDEA"] = listOf("ирландия","ирландский","флаг","ireland","ie","flag","irish","dublin")
        m["\uD83C\uDDF8\uD83C\uDDEC"] = listOf("сингапур","сингапурский","флаг","singapore","sg","flag","singaporean")
        m["\uD83C\uDDF2\uD83C\uDDFE"] = listOf("малайзия","малайзийский","флаг","malaysia","my","flag","malaysian","kuala lumpur")
        m["\uD83C\uDDF5\uD83C\uDDED"] = listOf("филиппины","филиппинский","флаг","philippines","ph","flag","filipino","manila")
        m["\uD83C\uDDE8\uD83C\uDDF1"] = listOf("чили","чилийский","флаг","chile","cl","flag","chilean","santiago")
        m["\uD83C\uDDE8\uD83C\uDDF4"] = listOf("колумбия","колумбийский","флаг","colombia","co","flag","colombian","bogota")
        m["\uD83C\uDDF5\uD83C\uDDEA"] = listOf("перу","перуанский","флаг","peru","pe","flag","peruvian","lima")
        m["\uD83C\uDDE8\uD83C\uDDFA"] = listOf("куба","кубинский","флаг","cuba","cu","flag","cuban","havana")
        m["\uD83C\uDDF3\uD83C\uDDEC"] = listOf("нигерия","нигерийский","флаг","nigeria","ng","flag","nigerian","lagos","abuja")
        m["\uD83C\uDDFF\uD83C\uDDE6"] = listOf("юар","южная африка","флаг","south africa","za","flag","african","cape town")
        m["\uD83C\uDDF0\uD83C\uDDEA"] = listOf("кения","кенийский","флаг","kenya","ke","flag","kenyan","nairobi")
        m["\uD83C\uDDF2\uD83C\uDDE6"] = listOf("марокко","марокканский","флаг","morocco","ma","flag","moroccan","rabat")
        m["\uD83C\uDDF5\uD83C\uDDF0"] = listOf("пакистан","пакистанский","флаг","pakistan","pk","flag","pakistani","islamabad")
        m["\uD83C\uDDE7\uD83C\uDDE9"] = listOf("бангладеш","бангладешский","флаг","bangladesh","bd","flag","bangladeshi","dhaka")
        m["\uD83C\uDDEE\uD83C\uDDF6"] = listOf("ирак","иракский","флаг","iraq","iq","flag","iraqi","baghdad")
        m["\uD83C\uDDEE\uD83C\uDDF7"] = listOf("иран","иранский","флаг","iran","ir","flag","iranian","tehran","persia")
        m["\uD83C\uDDF7\uD83C\uDDF8"] = listOf("сербия","сербский","флаг","serbia","rs","flag","serbian","belgrade")
        m["\uD83C\uDDED\uD83C\uDDF7"] = listOf("хорватия","хорватский","флаг","croatia","hr","flag","croatian","zagreb")
        m["\uD83C\uDDE7\uD83C\uDDEC"] = listOf("болгария","болгарский","флаг","bulgaria","bg","flag","bulgarian","sofia")
        m["\uD83C\uDDF1\uD83C\uDDF9"] = listOf("литва","литовский","флаг","lithuania","lt","flag","lithuanian","vilnius")
        m["\uD83C\uDDF1\uD83C\uDDFB"] = listOf("латвия","латвийский","флаг","latvia","lv","flag","latvian","riga")
        m["\uD83C\uDDEA\uD83C\uDDEA"] = listOf("эстония","эстонский","флаг","estonia","ee","flag","estonian","tallinn")
        m["\uD83C\uDDF2\uD83C\uDDE9"] = listOf("молдова","молдавский","флаг","moldova","md","flag","moldovan","chisinau")
        m["\uD83C\uDDF0\uD83C\uDDEC"] = listOf("кыргызстан","киргизский","флаг","kyrgyzstan","kg","flag","kyrgyz","bishkek")
        m["\uD83C\uDDF9\uD83C\uDDEF"] = listOf("таджикистан","таджикский","флаг","tajikistan","tj","flag","tajik","dushanbe")
        m["\uD83C\uDDF9\uD83C\uDDF2"] = listOf("туркменистан","туркменский","флаг","turkmenistan","tm","flag","turkmen","ashgabat")
        m["\uD83C\uDDF2\uD83C\uDDF3"] = listOf("монголия","монгольский","флаг","mongolia","mn","flag","mongolian","ulaanbaatar")
        m["\uD83C\uDDEF\uD83C\uDDF4"] = listOf("иордания","иорданский","флаг","jordan","jo","flag","jordanian","amman")
        m["\uD83C\uDDF1\uD83C\uDDE7"] = listOf("ливан","ливанский","флаг","lebanon","lb","flag","lebanese","beirut")
        m["\uD83C\uDDF6\uD83C\uDDE6"] = listOf("катар","катарский","флаг","qatar","qa","flag","qatari","doha")
        m["\uD83C\uDDF0\uD83C\uDDFC"] = listOf("кувейт","кувейтский","флаг","kuwait","kw","flag","kuwaiti")
        m["\uD83C\uDDE7\uD83C\uDDED"] = listOf("бахрейн","бахрейнский","флаг","bahrain","bh","flag","bahraini","manama")
        m["\uD83C\uDDF4\uD83C\uDDF2"] = listOf("оман","оманский","флаг","oman","om","flag","omani","muscat")
        m["\uD83C\uDDFE\uD83C\uDDEA"] = listOf("йемен","йеменский","флаг","yemen","ye","flag","yemeni","sanaa")
        m["\uD83C\uDDF8\uD83C\uDDFE"] = listOf("сирия","сирийский","флаг","syria","sy","flag","syrian","damascus")
        m["\uD83C\uDDE8\uD83C\uDDFE"] = listOf("кипр","кипрский","флаг","cyprus","cy","flag","cypriot","nicosia")
        m["\uD83C\uDDF2\uD83C\uDDF9"] = listOf("мальта","мальтийский","флаг","malta","mt","flag","maltese","valletta")
        m["\uD83C\uDDEE\uD83C\uDDF8"] = listOf("исландия","исландский","флаг","iceland","is","flag","icelandic","reykjavik")
        m["\uD83C\uDDF1\uD83C\uDDFA"] = listOf("люксембург","люксембургский","флаг","luxembourg","lu","flag")
        m["\uD83C\uDDF2\uD83C\uDDE8"] = listOf("монако","монакский","флаг","monaco","mc","flag")
        m["\uD83C\uDDFB\uD83C\uDDE6"] = listOf("ватикан","папа","флаг","vatican","va","flag","pope","holy see")
        m["\uD83C\uDDE6\uD83C\uDDE9"] = listOf("андорра","андоррский","флаг","andorra","ad","flag")
        m["\uD83C\uDDF1\uD83C\uDDEE"] = listOf("лихтенштейн","флаг","liechtenstein","li","flag")
        m["\uD83C\uDDF8\uD83C\uDDF2"] = listOf("сан-марино","флаг","san marino","sm","flag")
        m["\uD83C\uDDF8\uD83C\uDDF0"] = listOf("словакия","словацкий","флаг","slovakia","sk","flag","slovak","bratislava")
        m["\uD83C\uDDF8\uD83C\uDDEE"] = listOf("словения","словенский","флаг","slovenia","si","flag","slovenian","ljubljana")
        m["\uD83C\uDDE6\uD83C\uDDF1"] = listOf("албания","албанский","флаг","albania","al","flag","albanian","tirana")
        m["\uD83C\uDDF2\uD83C\uDDF0"] = listOf("северная македония","македонский","флаг","north macedonia","mk","flag","macedonian","skopje")
        m["\uD83C\uDDF2\uD83C\uDDEA"] = listOf("черногория","черногорский","флаг","montenegro","me","flag","montenegrin","podgorica")
        m["\uD83C\uDDE7\uD83C\uDDE6"] = listOf("босния","герцеговина","боснийский","флаг","bosnia","ba","flag","bosnian","sarajevo")
        m["\uD83C\uDDFD\uD83C\uDDF0"] = listOf("косово","косовский","флаг","kosovo","xk","flag","pristina")
        m["\uD83C\uDDF5\uD83C\uDDF7"] = listOf("пуэрто-рико","флаг","puerto rico","pr","flag")
        m["\uD83C\uDDED\uD83C\uDDF0"] = listOf("гонконг","флаг","hong kong","hk","flag")
        m["\uD83C\uDDF9\uD83C\uDDFC"] = listOf("тайвань","тайваньский","флаг","taiwan","tw","flag","taiwanese","taipei")
        m["\uD83C\uDDF2\uD83C\uDDF4"] = listOf("макао","флаг","macao","macau","mo","flag")
        m["\uD83C\uDDEB\uD83C\uDDF7"] = listOf("франция","французский","флаг","france","fr","flag","french","paris")
        m["\uD83C\uDDE8\uD83C\uDDF7"] = listOf("коста-рика","костариканский","флаг","costa rica","cr","flag")
        m["\uD83C\uDDEF\uD83C\uDDF2"] = listOf("ямайка","ямайский","флаг","jamaica","jm","flag","jamaican","kingston")
        m["\uD83C\uDDF9\uD83C\uDDF9"] = listOf("тринидад","тобаго","флаг","trinidad","tobago","tt","flag")
        m["\uD83C\uDDF5\uD83C\uDDE6"] = listOf("панама","панамский","флаг","panama","pa","flag")
        m["\uD83C\uDDEC\uD83C\uDDF9"] = listOf("гватемала","флаг","guatemala","gt","flag")
        m["\uD83C\uDDED\uD83C\uDDF3"] = listOf("гондурас","флаг","honduras","hn","flag")
        m["\uD83C\uDDF3\uD83C\uDDEE"] = listOf("никарагуа","флаг","nicaragua","ni","flag")
        m["\uD83C\uDDF8\uD83C\uDDFB"] = listOf("сальвадор","флаг","el salvador","sv","flag")
        m["\uD83C\uDDE9\uD83C\uDDF4"] = listOf("доминикана","доминиканский","флаг","dominican republic","do","flag","dominican")
        m["\uD83C\uDDED\uD83C\uDDF9"] = listOf("гаити","флаг","haiti","ht","flag")
        m["\uD83C\uDDEA\uD83C\uDDE8"] = listOf("эквадор","флаг","ecuador","ec","flag")
        m["\uD83C\uDDFB\uD83C\uDDEA"] = listOf("венесуэла","флаг","venezuela","ve","flag","venezuelan")
        m["\uD83C\uDDE7\uD83C\uDDF4"] = listOf("боливия","флаг","bolivia","bo","flag","bolivian")
        m["\uD83C\uDDF5\uD83C\uDDFE"] = listOf("парагвай","флаг","paraguay","py","flag")
        m["\uD83C\uDDFA\uD83C\uDDFE"] = listOf("уругвай","флаг","uruguay","uy","flag","uruguayan")
        m["\uD83C\uDDEC\uD83C\uDDED"] = listOf("гана","ганский","флаг","ghana","gh","flag","ghanaian","accra")
        m["\uD83C\uDDEA\uD83C\uDDF9"] = listOf("эфиопия","эфиопский","флаг","ethiopia","et","flag","ethiopian","addis ababa")
        m["\uD83C\uDDF9\uD83C\uDDFF"] = listOf("танзания","танзанийский","флаг","tanzania","tz","flag","tanzanian","dodoma")
        m["\uD83C\uDDFA\uD83C\uDDEC"] = listOf("уганда","угандийский","флаг","uganda","ug","flag","ugandan","kampala")
        m["\uD83C\uDDFE\uD83C\uDDEA"] = listOf("йемен","йеменский","флаг","yemen","ye","flag","yemeni","sanaa")
        m["\uD83C\uDDF2\uD83C\uDDFF"] = listOf("мозамбик","флаг","mozambique","mz","flag")
        m["\uD83C\uDDE8\uD83C\uDDF2"] = listOf("камерун","флаг","cameroon","cm","flag")
        m["\uD83C\uDDE8\uD83C\uDDE9"] = listOf("конго","флаг","congo","cd","flag","drc","kinshasa")
        m["\uD83C\uDDF8\uD83C\uDDF3"] = listOf("сенегал","флаг","senegal","sn","flag")
        m["\uD83C\uDDF9\uD83C\uDDF3"] = listOf("тунис","тунисский","флаг","tunisia","tn","flag","tunisian","tunis")
        m["\uD83C\uDDE9\uD83C\uDDFF"] = listOf("алжир","алжирский","флаг","algeria","dz","flag","algerian","algiers")
        m["\uD83C\uDDF1\uD83C\uDDFE"] = listOf("ливия","ливийский","флаг","libya","ly","flag","libyan","tripoli")
        m["\uD83C\uDDF8\uD83C\uDDE9"] = listOf("судан","суданский","флаг","sudan","sd","flag","sudanese","khartoum")
        m["\uD83C\uDDF2\uD83C\uDDF2"] = listOf("мьянма","бирма","флаг","myanmar","burma","mm","flag")
        m["\uD83C\uDDF1\uD83C\uDDE6"] = listOf("лаос","лаосский","флаг","laos","la","flag","lao","vientiane")
        m["\uD83C\uDDF0\uD83C\uDDED"] = listOf("камбоджа","камбоджийский","флаг","cambodia","kh","flag","cambodian","phnom penh")
        m["\uD83C\uDDF5\uD83C\uDDED"] = listOf("филиппины","филиппинский","флаг","philippines","ph","flag","filipino","manila")
        m["\uD83C\uDDF1\uD83C\uDDF0"] = listOf("шри-ланка","ланкийский","флаг","sri lanka","lk","flag","lankan","colombo")
        m["\uD83C\uDDF3\uD83C\uDDF5"] = listOf("непал","непальский","флаг","nepal","np","flag","nepali","kathmandu")
        m["\uD83C\uDDE7\uD83C\uDDF9"] = listOf("бутан","флаг","bhutan","bt","flag","bhutanese","thimphu")
        m["\uD83C\uDDF2\uD83C\uDDFB"] = listOf("мальдивы","мальдивский","флаг","maldives","mv","flag","maldivian","male")
        m["\uD83C\uDDEB\uD83C\uDDEF"] = listOf("фиджи","фиджийский","флаг","fiji","fj","flag","fijian","suva")
        m["\uD83C\uDDF5\uD83C\uDDEC"] = listOf("папуа","гвинея","флаг","papua new guinea","pg","flag")
        m["\uD83C\uDDFC\uD83C\uDDF8"] = listOf("самоа","флаг","samoa","ws","flag")
        m["\uD83C\uDDF9\uD83C\uDDF4"] = listOf("тонга","флаг","tonga","to","flag")
        m["\uD83C\uDDF2\uD83C\uDDED"] = listOf("маршалловы","острова","флаг","marshall islands","mh","flag")
        m["\uD83C\uDDF5\uD83C\uDDFC"] = listOf("палау","флаг","palau","pw","flag")
        m["\uD83C\uDDEB\uD83C\uDDF2"] = listOf("микронезия","флаг","micronesia","fm","flag")
        m["\uD83C\uDDF0\uD83C\uDDEE"] = listOf("кирибати","флаг","kiribati","ki","flag")
        m["\uD83C\uDDF3\uD83C\uDDF7"] = listOf("науру","флаг","nauru","nr","flag")
        m["\uD83C\uDDF9\uD83C\uDDFB"] = listOf("тувалу","флаг","tuvalu","tv","flag")
        m["\uD83C\uDDFB\uD83C\uDDFA"] = listOf("вануату","флаг","vanuatu","vu","flag")
        m["\uD83C\uDDF8\uD83C\uDDE7"] = listOf("соломоновы","острова","флаг","solomon islands","sb","flag")
        m["\uD83C\uDDF3\uD83C\uDDFA"] = listOf("ниуэ","флаг","niue","nu","flag")
        m["\uD83C\uDDE8\uD83C\uDDF0"] = listOf("острова кука","флаг","cook islands","ck","flag")
        m["\uD83C\uDDF9\uD83C\uDDF0"] = listOf("токелау","флаг","tokelau","tk","flag")
        m["\uD83C\uDDFC\uD83C\uDDEB"] = listOf("уоллис","футуна","флаг","wallis","futuna","wf","flag")
        m["\uD83C\uDDE6\uD83C\uDDF8"] = listOf("американское самоа","флаг","american samoa","as","flag")
        m["\uD83C\uDDEC\uD83C\uDDFA"] = listOf("гуам","флаг","guam","gu","flag")
        m["\uD83C\uDDF2\uD83C\uDDF5"] = listOf("северные марианские","флаг","northern mariana","mp","flag")
        m["\uD83C\uDDFB\uD83C\uDDEE"] = listOf("виргинские острова","флаг","virgin islands","vi","flag","us virgin")
        m["\uD83C\uDDF5\uD83C\uDDEB"] = listOf("французская полинезия","флаг","french polynesia","pf","flag","tahiti")
        m["\uD83C\uDDF3\uD83C\uDDE8"] = listOf("новая каледония","флаг","new caledonia","nc","flag")
        m["\uD83D\uDEA9"] = listOf("флаг","треугольный","знамя","flag","triangular","banner","pennant")
        m["\uD83C\uDFF3\uFE0F"] = listOf("флаг","белый","мир","white","flag","peace","surrender")
        m["\uD83C\uDFF4"] = listOf("флаг","чёрный","пиратский","black","flag","pirate","waving")
        m["\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08"] = listOf("радуга","лгбт","прайд","rainbow","flag","pride","lgbtq","gay")
        m["\uD83C\uDFF4\u200D\u2620\uFE0F"] = listOf("пиратский","флаг","череп","pirate","flag","skull","jolly roger")
        return m
    }

    private fun getEmojiData(): List<List<String>> {
        return listOf(
            listOf(
                "\uD83D\uDE00","\uD83D\uDE06","\uD83E\uDD23","\uD83D\uDE07",
                "\uD83D\uDE0A","\uD83D\uDE0F","\uD83D\uDE18","\uD83D\uDE1B",
                "\uD83D\uDE04","\uD83D\uDE05","\uD83D\uDE02","\u263A\uFE0F",
                "\uD83D\uDE0C","\uD83D\uDE0D","\uD83D\uDE17","\uD83D\uDE1C",
                "\uD83D\uDE03","\uD83E\uDD72","\uD83D\uDE42","\uD83E\uDD17",
                "\uD83D\uDE09","\uD83E\uDD70","\uD83D\uDE19","\uD83E\uDD2A",
                "\uD83D\uDE01","\uD83D\uDE22","\uD83D\uDE43","\uD83E\uDD2D",
                "\uD83D\uDE0B","\uD83D\uDE3B","\uD83E\uDD73","\uD83E\uDD28",
                "\uD83E\uDD13","\uD83D\uDE24","\uD83E\uDD25","\uD83E\uDD78",
                "\uD83D\uDE08","\uD83D\uDC7F","\uD83D\uDC80","\u2620\uFE0F",
                "\uD83D\uDCA9","\uD83E\uDD21","\uD83D\uDC79","\uD83D\uDC7A",
                "\uD83D\uDC7B","\uD83D\uDC7D","\uD83D\uDC7E","\uD83E\uDD16",
                "\uD83D\uDE3A","\uD83D\uDE38","\uD83D\uDE39","\uD83D\uDE3B",
                "\uD83D\uDE3C","\uD83D\uDE3D","\uD83D\uDE40","\uD83D\uDE3F",
                "\uD83D\uDE3E","\uD83D\uDE48","\uD83D\uDE49","\uD83D\uDE4A",
                "\uD83D\uDC4B","\uD83E\uDD1A","\u270B","\uD83D\uDD96",
                "\uD83D\uDC4C","\uD83E\uDD0F","\u270C\uFE0F","\uD83E\uDD1E",
                "\uD83E\uDD1F","\uD83E\uDD18","\uD83E\uDD19","\uD83D\uDC48",
                "\uD83D\uDC49","\uD83D\uDC46","\uD83D\uDC47","\u261D\uFE0F",
                "\uD83D\uDC4D","\uD83D\uDC4E","\u270A","\uD83D\uDC4A",
                "\uD83E\uDD1B","\uD83E\uDD1C","\uD83D\uDC4F","\uD83D\uDE4C",
                "\uD83D\uDC50","\uD83E\uDD32","\uD83E\uDD1D","\uD83D\uDE4F"
            ),
            listOf(
                "\uD83D\uDC36","\uD83D\uDC31","\uD83D\uDC2D","\uD83D\uDC39",
                "\uD83D\uDC30","\uD83E\uDD8A","\uD83D\uDC3B","\uD83D\uDC3C",
                "\uD83D\uDC28","\uD83D\uDC2F","\uD83E\uDD81","\uD83D\uDC2E",
                "\uD83D\uDC37","\uD83D\uDC38","\uD83D\uDC35","\uD83D\uDC12",
                "\uD83D\uDC14","\uD83D\uDC27","\uD83D\uDC26","\uD83D\uDC24",
                "\uD83D\uDC23","\uD83D\uDC25","\uD83E\uDD86","\uD83E\uDD85",
                "\uD83E\uDD89","\uD83E\uDD87","\uD83D\uDC3A","\uD83D\uDC17",
                "\uD83D\uDC34","\uD83E\uDD84","\uD83D\uDC1D","\uD83E\uDD8B",
                "\uD83D\uDC0C","\uD83D\uDC1E","\uD83D\uDC1C","\uD83D\uDC22",
                "\uD83D\uDC0D","\uD83E\uDD8E","\uD83E\uDD96","\uD83E\uDD95",
                "\uD83D\uDC19","\uD83E\uDD91","\uD83E\uDD80","\uD83D\uDC21",
                "\uD83D\uDC20","\uD83D\uDC1F","\uD83D\uDC2C","\uD83D\uDC33"
            ),
            listOf(
                "\uD83C\uDF4E","\uD83C\uDF50","\uD83C\uDF4A","\uD83C\uDF4B",
                "\uD83C\uDF4C","\uD83C\uDF49","\uD83C\uDF47","\uD83C\uDF53",
                "\uD83C\uDF48","\uD83C\uDF52","\uD83C\uDF51","\uD83C\uDF4D",
                "\uD83E\uDD5D","\uD83C\uDF45","\uD83E\uDD51","\uD83C\uDF46",
                "\uD83E\uDD52","\uD83E\uDD66","\uD83C\uDF44","\uD83C\uDF5E",
                "\uD83E\uDD50","\uD83E\uDD56","\uD83E\uDDC0","\uD83C\uDF56",
                "\uD83C\uDF57","\uD83E\uDD69","\uD83C\uDF54","\uD83C\uDF5F",
                "\uD83C\uDF55","\uD83C\uDF2D","\uD83E\uDD6A","\uD83C\uDF2E",
                "\uD83C\uDF2F","\uD83E\uDD59","\uD83C\uDF73","\uD83E\uDD58",
                "\uD83C\uDF72","\uD83E\uDD63","\uD83E\uDD57","\uD83C\uDF7F"
            ),
            listOf(
                "\u26BD","\uD83C\uDFC0","\uD83C\uDFC8","\u26BE",
                "\uD83C\uDFBE","\uD83C\uDFD0","\uD83C\uDFC9","\uD83C\uDFB1",
                "\uD83C\uDFD3","\uD83C\uDFF8","\uD83C\uDFD2","\uD83C\uDFCF",
                "\u26F3","\uD83C\uDFF9","\uD83C\uDFA3","\uD83E\uDD4A",
                "\uD83E\uDD4B","\uD83C\uDFBD","\uD83C\uDFBF","\uD83C\uDFC2",
                "\uD83C\uDFC4","\uD83C\uDFCA","\uD83E\uDD3D","\uD83D\uDEB4"
            ),
            listOf(
                "\uD83D\uDE97","\uD83D\uDE95","\uD83D\uDE99","\uD83D\uDE8C",
                "\uD83D\uDE93","\uD83D\uDE91","\uD83D\uDE92","\uD83D\uDE9A",
                "\uD83D\uDE9B","\uD83D\uDE9C","\uD83D\uDEB2","\uD83D\uDE94",
                "\uD83D\uDE8D","\uD83D\uDE98","\uD83D\uDE84","\uD83D\uDE85",
                "\uD83D\uDE82","\uD83D\uDE86","\uD83D\uDE87","\uD83D\uDE89",
                "\u2708\uFE0F","\uD83D\uDEEB","\uD83D\uDE80","\uD83D\uDE81"
            ),
            listOf(
                "\u2764\uFE0F","\uD83E\uDDE1","\uD83D\uDC9B","\uD83D\uDC9A",
                "\uD83D\uDC99","\uD83D\uDC9C","\uD83D\uDDA4","\uD83E\uDD0D",
                "\uD83E\uDD0E","\uD83D\uDC94","\u2763\uFE0F","\uD83D\uDC95",
                "\uD83D\uDC9E","\uD83D\uDC93","\uD83D\uDC97","\uD83D\uDC96",
                "\uD83D\uDC9D","\uD83D\uDC98","\uD83D\uDC8C","\uD83D\uDD34",
                "\uD83D\uDFE0","\uD83D\uDFE1","\uD83D\uDFE2","\uD83D\uDD35",
                "\uD83D\uDFE3","\u26AB","\u26AA","\uD83D\uDFE4",
                "\uD83D\uDD3A","\uD83D\uDD3B","\uD83D\uDD38","\uD83D\uDD39"
            ),
            /* ── Flags ── */
            listOf(
                "\uD83C\uDDF7\uD83C\uDDFA","\uD83C\uDDFA\uD83C\uDDF8","\uD83C\uDDEC\uD83C\uDDE7","\uD83C\uDDE9\uD83C\uDDEA",
                "\uD83C\uDDEB\uD83C\uDDF7","\uD83C\uDDEE\uD83C\uDDF9","\uD83C\uDDEA\uD83C\uDDF8","\uD83C\uDDF5\uD83C\uDDF9",
                "\uD83C\uDDE7\uD83C\uDDF7","\uD83C\uDDE8\uD83C\uDDF3","\uD83C\uDDEF\uD83C\uDDF5","\uD83C\uDDF0\uD83C\uDDF7",
                "\uD83C\uDDEE\uD83C\uDDF3","\uD83C\uDDE6\uD83C\uDDEA","\uD83C\uDDF9\uD83C\uDDF7","\uD83C\uDDFA\uD83C\uDDE6",
                "\uD83C\uDDE7\uD83C\uDDFE","\uD83C\uDDF0\uD83C\uDDFF","\uD83C\uDDFA\uD83C\uDDFF","\uD83C\uDDEC\uD83C\uDDEA",
                "\uD83C\uDDE6\uD83C\uDDF2","\uD83C\uDDE6\uD83C\uDDFF","\uD83C\uDDF5\uD83C\uDDF1","\uD83C\uDDE8\uD83C\uDDE6",
                "\uD83C\uDDE6\uD83C\uDDFA","\uD83C\uDDF2\uD83C\uDDFD","\uD83C\uDDE6\uD83C\uDDF7","\uD83C\uDDEE\uD83C\uDDF1",
                "\uD83C\uDDF8\uD83C\uDDE6","\uD83C\uDDEA\uD83C\uDDEC","\uD83C\uDDF9\uD83C\uDDED","\uD83C\uDDFB\uD83C\uDDF3",
                "\uD83C\uDDF3\uD83C\uDDF1","\uD83C\uDDE7\uD83C\uDDEA","\uD83C\uDDE8\uD83C\uDDED","\uD83C\uDDE6\uD83C\uDDF9",
                "\uD83C\uDDF8\uD83C\uDDEA","\uD83C\uDDF3\uD83C\uDDF4","\uD83C\uDDE9\uD83C\uDDF0","\uD83C\uDDEB\uD83C\uDDEE",
                "\uD83C\uDDEE\uD83C\uDDE9","\uD83C\uDDF3\uD83C\uDDFF","\uD83C\uDDEC\uD83C\uDDF7","\uD83C\uDDE8\uD83C\uDDFF",
                "\uD83C\uDDF7\uD83C\uDDF4","\uD83C\uDDED\uD83C\uDDFA","\uD83C\uDDEE\uD83C\uDDEA","\uD83C\uDDF8\uD83C\uDDEC",
                "\uD83C\uDDF2\uD83C\uDDFE","\uD83C\uDDF5\uD83C\uDDED","\uD83C\uDDE8\uD83C\uDDF1","\uD83C\uDDE8\uD83C\uDDF4",
                "\uD83C\uDDF5\uD83C\uDDEA","\uD83C\uDDE8\uD83C\uDDFA","\uD83C\uDDF3\uD83C\uDDEC","\uD83C\uDDFF\uD83C\uDDE6",
                "\uD83C\uDDF0\uD83C\uDDEA","\uD83C\uDDF2\uD83C\uDDE6","\uD83C\uDDF5\uD83C\uDDF0","\uD83C\uDDE7\uD83C\uDDE9",
                "\uD83C\uDDEE\uD83C\uDDF6","\uD83C\uDDEE\uD83C\uDDF7","\uD83C\uDDF7\uD83C\uDDF8","\uD83C\uDDED\uD83C\uDDF7",
                "\uD83C\uDDE7\uD83C\uDDEC","\uD83C\uDDF1\uD83C\uDDF9","\uD83C\uDDF1\uD83C\uDDFB","\uD83C\uDDEA\uD83C\uDDEA",
                "\uD83C\uDDF2\uD83C\uDDE9","\uD83C\uDDF0\uD83C\uDDEC","\uD83C\uDDF9\uD83C\uDDEF","\uD83C\uDDF9\uD83C\uDDF2",
                "\uD83C\uDDF2\uD83C\uDDF3","\uD83C\uDDEF\uD83C\uDDF4","\uD83C\uDDF1\uD83C\uDDE7","\uD83C\uDDF6\uD83C\uDDE6",
                "\uD83C\uDDF0\uD83C\uDDFC","\uD83C\uDDE7\uD83C\uDDED","\uD83C\uDDF4\uD83C\uDDF2","\uD83C\uDDF8\uD83C\uDDFE",
                "\uD83C\uDDE8\uD83C\uDDFE","\uD83C\uDDF2\uD83C\uDDF9","\uD83C\uDDEE\uD83C\uDDF8","\uD83C\uDDF8\uD83C\uDDF0",
                "\uD83C\uDDF8\uD83C\uDDEE","\uD83C\uDDE6\uD83C\uDDF1","\uD83C\uDDF2\uD83C\uDDF0","\uD83C\uDDF2\uD83C\uDDEA",
                "\uD83C\uDDE7\uD83C\uDDE6","\uD83C\uDDFD\uD83C\uDDF0","\uD83C\uDDED\uD83C\uDDF0","\uD83C\uDDF9\uD83C\uDDFC",
                "\uD83D\uDEA9","\uD83C\uDFF3\uFE0F","\uD83C\uDFF4",
                "\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08","\uD83C\uDFF4\u200D\u2620\uFE0F"
            )
        )
    }

    /* ================================================================
       PUBLIC API
       ================================================================ */
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
        /* Don't close emoji picker if we're in emoji search mode */
        if (isEmojiMode && !isEmojiSearchMode) hideEmojiPicker()
        applyLayout()
    }

    fun setMode(mode: ParaphraseMode) { currentMode = mode }

    fun reset() {
        isShifted = false; isCapsLocked = false
        if (isEmojiMode) hideEmojiPicker()
        applyLayout()
    }

    fun updateReturnKeyType(imeOpts: Int) {}
    fun setLoading(loading: Boolean) {}

    /* suggestions */
    fun updateSuggestions(list: List<String>) {
        suggestionBox.removeAllViews()
        val chipBg = if (isDarkTheme) 0x33FFFFFF else 0x22000000
        for (word in list) {
            suggestionBox.addView(TextView(context).apply {
                text = word; textSize = 14f; setTextColor(COL_TEXT)
                gravity = Gravity.CENTER
                setPadding(dp(10), dp(4), dp(10), dp(4))
                background = roundedBg(chipBg, dp(6).toFloat())
                layoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, dp(28)).apply {
                    setMargins(dp(3), 0, dp(3), 0)
                }
                isClickable = true; isFocusable = true
                setOnClickListener { listener?.onSuggestionPicked(word) }
            })
        }
    }

    fun clearSuggestions() { suggestionBox.removeAllViews() }

    /* AI overlay */
    fun showAIMenu() {
        toolbar.visibility = GONE
        keysSection.visibility = GONE
        actionSection.visibility = GONE
        bottomBar.visibility = GONE
        if (isEmojiMode) hideEmojiPicker()
        if (findViewWithTag<View>("ai_overlay") == null) {
            val ov = AIMenuOverlay(context).apply {
                tag = "ai_overlay"
                onDismiss = { hideAIMenu() }
                onGenerate = { mode ->
                    listener?.onKeyPressed("MODE:${mode.name}")
                    hideAIMenu()
                }
            }
            addView(ov)
        }
    }

    fun hideAIMenu() {
        findViewWithTag<View>("ai_overlay")?.let { removeView(it) }
        toolbar.visibility = VISIBLE
        keysSection.visibility = VISIBLE
        actionSection.visibility = VISIBLE
        bottomBar.visibility = VISIBLE
    }

    fun setSuggestionStripListener(l: SuggestionStripListener) {}

    /* ================================================================
       PRIVATE HELPERS
       ================================================================ */
    private var deleteButtonDown = false
    private val longPressDelay = 300L
    private val longPressHandler = android.os.Handler(android.os.Looper.getMainLooper())

    private fun createKeyButton(label: String): Button {
        return Button(context).apply {
            text = label; textSize = 22f
            setTextColor(COL_TEXT); isAllCaps = false
            typeface = Typeface.DEFAULT
            background = roundedBg(COL_KEY, dp(5).toFloat())
            layoutParams = LayoutParams(0, LayoutParams.MATCH_PARENT, 1f).apply {
                setMargins(dp(2), dp(1), dp(2), dp(1))
            }
            setPadding(0,0,0,0); minWidth = 0; minHeight = 0

            setOnTouchListener { v, ev ->
                val btn = v as Button
                val key = btn.text.toString()
                when (ev.action) {
                    MotionEvent.ACTION_DOWN -> {
                        btn.background = roundedBg(COL_KEY_PRESS, dp(5).toFloat())
                        if (key == "\u232B") {
                            if (isEmojiSearchMode) {
                                // Route delete to search query
                                if (emojiSearchQuery.isNotEmpty()) {
                                    emojiSearchQuery = emojiSearchQuery.dropLast(1)
                                    updateEmojiSearchDisplay()
                                }
                            } else {
                                deleteButtonDown = true
                                listener?.onDeletePressed()
                                longPressHandler.postDelayed({
                                    if (deleteButtonDown) listener?.onDeleteLongPressStart()
                                }, longPressDelay)
                            }
                        } else {
                            handleKeyClick(key)
                        }
                    }
                    MotionEvent.ACTION_UP -> {
                        restoreBg(btn)
                        if (key == "\u232B" && deleteButtonDown) {
                            deleteButtonDown = false
                            longPressHandler.removeCallbacksAndMessages(null)
                            listener?.onDeleteLongPressEnd()
                        }
                    }
                    MotionEvent.ACTION_CANCEL -> {
                        restoreBg(btn)
                        if (key == "\u232B" && deleteButtonDown) {
                            deleteButtonDown = false
                            longPressHandler.removeCallbacksAndMessages(null)
                            listener?.onDeleteLongPressEnd()
                        }
                    }
                }
                true
            }
        }
    }

    private fun handleKeyClick(key: String) {
        /* ── Emoji search mode intercept ── */
        if (isEmojiSearchMode) {
            when (key) {
                "\u21E7", "\u21EA" -> listener?.onShiftPressed()
                "\u232B" -> {
                    if (emojiSearchQuery.isNotEmpty()) {
                        emojiSearchQuery = emojiSearchQuery.dropLast(1)
                        updateEmojiSearchDisplay()
                    }
                }
                "#+=", "123" -> {
                    if (isSymbolMode) symbolPage = if (symbolPage == 0) 1 else 0
                    else { isSymbolMode = true; symbolPage = 0 }
                    applyLayout()
                }
                "\u0410\u0411\u0412", "ABC" -> { isSymbolMode = false; applyLayout() }
                else -> {
                    emojiSearchQuery += key
                    updateEmojiSearchDisplay()
                }
            }
            return
        }
        /* ── Normal mode ── */
        when (key) {
            "\u21E7", "\u21EA" -> listener?.onShiftPressed()
            "\u232B" -> listener?.onDeletePressed()
            "#+=", "123" -> {
                if (isSymbolMode) symbolPage = if (symbolPage == 0) 1 else 0
                else { isSymbolMode = true; symbolPage = 0 }
                applyLayout()
            }
            "\u0410\u0411\u0412", "ABC" -> { isSymbolMode = false; applyLayout() }
            else -> listener?.onKeyPressed(key)
        }
    }

    private fun restoreBg(btn: Button) {
        val t = btn.text.toString()
        btn.background = when {
            t == "\u21E7" || t == "\u21EA" -> roundedBg(shiftBgColor(), dp(5).toFloat())
            else -> roundedBg(COL_KEY, dp(5).toFloat())
        }
    }

    private fun shiftBgColor(): Int = when {
        isCapsLocked -> 0xFFDDDDE0.toInt()
        isShifted    -> 0xFFE8E8EC.toInt()
        else         -> COL_KEY
    }

    private fun setWeight(btn: Button, w: Float) {
        (btn.layoutParams as LayoutParams).weight = w
    }

    private fun roundedBg(color: Int, r: Float = dp(5).toFloat()) =
        GradientDrawable().apply { setColor(color); cornerRadius = r }
}

/* =================================================================
   AI MENU OVERLAY - Redesigned with generation workflow
   Dark-mode aware, purple active state, mode persistence
   ================================================================= */
class AIMenuOverlay @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    var onDismiss: (() -> Unit)? = null
    var onGenerate: ((ParaphraseMode) -> Unit)? = null

    private val isDark: Boolean =
        (context.resources.configuration.uiMode and
                android.content.res.Configuration.UI_MODE_NIGHT_MASK) ==
                android.content.res.Configuration.UI_MODE_NIGHT_YES

    private val C_BG   = if (isDark) 0xFF1C1C1E.toInt() else 0xFFF0F0F0.toInt()
    private val C_CARD = if (isDark) 0xFF3A3A3C.toInt() else 0xFFFFFFFF.toInt()
    private val C_TEXT = if (isDark) 0xFFFFFFFF.toInt() else 0xFF000000.toInt()
    private val C_TEXT_SEC = if (isDark) 0xFFAAAAAA.toInt() else 0xFF888888.toInt()
    /* Dark / vivid purple for active mode */
    private val C_SEL  = if (isDark) 0xFF5E3F9E.toInt() else 0xFFE0D4F5.toInt()
    private val C_SEL_TEXT = if (isDark) 0xFFFFFFFF.toInt() else 0xFF3A1F78.toInt()

    private var selectedMode: ParaphraseMode? = null
    private val modeViews = mutableListOf<TextView>()

    private fun dp(v: Int) = (v * resources.displayMetrics.density + 0.5f).toInt()

    private fun roundedBg(color: Int, r: Float) =
        GradientDrawable().apply { setColor(color); cornerRadius = r }

    init {
        orientation = VERTICAL
        setBackgroundColor(C_BG)
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
        setPadding(dp(12), dp(8), dp(12), dp(12))

        /* Restore persisted mode if available */
        selectedMode = loadPersistedMode()

        /* ---- Title bar: "Reword Ai" left | "Улучшить текст" center | small round × right ---- */
        addView(FrameLayout(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(36))

            /* Left: branding */
            addView(TextView(context).apply {
                text = "Reword Ai"
                textSize = 13f
                setTextColor(C_TEXT_SEC)
                typeface = Typeface.DEFAULT
                gravity = Gravity.CENTER_VERTICAL
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    Gravity.START or Gravity.CENTER_VERTICAL
                )
            })

            /* Center: title */
            addView(TextView(context).apply {
                text = "\u0423\u043B\u0443\u0447\u0448\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442"
                textSize = 14f
                setTextColor(C_TEXT)
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    Gravity.CENTER
                )
            })

            /* Right: SMALLER close button (24dp circle) */
            val closeSize = dp(24)
            addView(TextView(context).apply {
                text = "\u2715"
                textSize = 12f
                setTextColor(if (isDark) 0xFFCCCCCC.toInt() else 0xFF444444.toInt())
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                layoutParams = FrameLayout.LayoutParams(closeSize, closeSize, Gravity.END or Gravity.CENTER_VERTICAL)
                background = GradientDrawable().apply {
                    setColor(if (isDark) 0xFF48484A.toInt() else 0xFFDDDDDD.toInt())
                    cornerRadius = (closeSize / 2).toFloat()
                }
                isClickable = true; isFocusable = true
                setOnClickListener { onDismiss?.invoke() }
            })
        })

        /* ---- Divider ---- */
        addView(View(context).apply {
            setBackgroundColor(if (isDark) 0xFF48484A.toInt() else 0xFFCCCCCC.toInt())
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 1).apply {
                setMargins(0, dp(4), 0, dp(4))
            }
        })

        /* ---- Mode buttons in 2 columns ---- */
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
            val modeView = TextView(context).apply {
                text = "${mode.displayName} ${mode.emoji}"
                textSize = 14f
                setTextColor(C_TEXT)
                gravity = Gravity.CENTER
                setPadding(dp(8), dp(12), dp(8), dp(12))
                background = roundedBg(C_CARD, dp(10).toFloat())
                layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f).apply {
                    setMargins(dp(3), 0, dp(3), 0)
                }
                isClickable = true; isFocusable = true
                setOnClickListener {
                    selectedMode = mode
                    persistMode(mode)
                    updateModeHighlights()
                }
            }
            modeViews.add(modeView)
            row?.addView(modeView)
        }

        /* Apply initial highlight */
        updateModeHighlights()

        /* ---- Generate button ---- */
        addView(LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(48))
            gravity = Gravity.CENTER
            setPadding(0, dp(6), 0, dp(2))

            addView(TextView(context).apply {
                text = "\u0413\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u2728"
                textSize = 15f
                setTextColor(C_TEXT)
                typeface = Typeface.DEFAULT_BOLD
                gravity = Gravity.CENTER
                setPadding(dp(24), dp(10), dp(24), dp(10))
                background = GradientDrawable().apply {
                    setColor(if (isDark) 0x66FFFFFF else 0xCCFFFFFF.toInt())
                    cornerRadius = dp(14).toFloat()
                    setStroke(1, if (isDark) 0x33FFFFFF else 0x33000000)
                }
                isClickable = true; isFocusable = true
                setOnClickListener {
                    val mode = selectedMode
                    if (mode != null) {
                        onGenerate?.invoke(mode)
                    }
                }
            })
        })
    }

    private fun updateModeHighlights() {
        val modes = ParaphraseMode.values()
        for ((i, tv) in modeViews.withIndex()) {
            val isSelected = (i < modes.size && modes[i] == selectedMode)
            tv.background = roundedBg(
                if (isSelected) C_SEL else C_CARD,
                dp(10).toFloat()
            )
            tv.setTextColor(if (isSelected) C_SEL_TEXT else C_TEXT)
            tv.typeface = if (isSelected) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }
    }

    /* ---- Mode persistence via SharedPreferences ---- */
    private fun persistMode(mode: ParaphraseMode) {
        context.getSharedPreferences("reword_shared_prefs", Context.MODE_PRIVATE)
            .edit().putString("selected_mode", mode.name).apply()
    }

    private fun loadPersistedMode(): ParaphraseMode? {
        val name = context.getSharedPreferences("reword_shared_prefs", Context.MODE_PRIVATE)
            .getString("selected_mode", null) ?: return null
        return try { ParaphraseMode.valueOf(name) } catch (_: Exception) { null }
    }
}
