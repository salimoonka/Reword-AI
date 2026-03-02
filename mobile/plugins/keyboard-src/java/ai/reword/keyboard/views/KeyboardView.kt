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
    private var selectedEmojiCategory = 0  // 0 = frequent, 1..6 = data categories

    /* Theme detection — prefers app's chosen mode from SharedPreferences;
       falls back to system dark mode flag. */
    private val isDarkTheme: Boolean = run {
        val prefs = context.getSharedPreferences("reword_shared_prefs", Context.MODE_PRIVATE)
        when (prefs.getString("theme_mode", "auto")) {
            "dark"  -> true
            "light" -> false
            else    -> // "auto" — follow system
                (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
                        Configuration.UI_MODE_NIGHT_YES
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

    /* Emoji picker colours */
    private val COL_EMOJI_BG      = if (isDarkTheme) 0xFF2C2C2E.toInt() else 0xFFF0F0F3.toInt()
    private val COL_EMOJI_SEARCH  = if (isDarkTheme) 0xFF3A3A3C.toInt() else 0xFFE4E4E8.toInt()
    private val COL_EMOJI_CAT_SEL = if (isDarkTheme) 0xFF48484A.toInt() else 0xFFD0D0D4.toInt()

    /* Icon size in px for toolbar circular buttons */
    private val ICON_SIZE_TB = dp(20)
    /* Icon size for bottom bar — matches emoji smiley icon (dp 24) */
    private val ICON_SIZE_BB = dp(24)

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
    private var emojiSearchResultsRow: HorizontalScrollView? = null
    private var emojiSearchTextView: TextView? = null
    private var emojiSearchClearBtn: ImageView? = null

    /* ================================================================
       INIT
       ================================================================ */
    init {
        orientation = VERTICAL
        setBackgroundColor(COL_BG)
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

            /* Globe - language toggle (monochrome vector) */
            addView(ImageView(context).apply {
                setImageDrawable(KeyboardIcons.globe(COL_TEXT, ICON_SIZE_BB))
                scaleType = ImageView.ScaleType.CENTER
                layoutParams = LayoutParams(dp(40), dp(40))
                isClickable = true; isFocusable = true
                setOnClickListener { listener?.onLanguageToggle() }
            })

            /* Spacer */
            addView(View(context).apply {
                layoutParams = LayoutParams(0, 0, 1f)
            })

            /* Mic - voice input (monochrome vector) */
            addView(ImageView(context).apply {
                setImageDrawable(KeyboardIcons.microphone(COL_TEXT, ICON_SIZE_BB))
                scaleType = ImageView.ScaleType.CENTER
                layoutParams = LayoutParams(dp(40), dp(40))
                isClickable = true; isFocusable = true
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
                /* Use same background as keyboard — no dimming, no separate tint */
                setBackgroundColor(COL_BG)
            }
            val idx = indexOfChild(bottomBar)
            addView(emojiContainer, idx)
        }
        /* Ensure full height for grid mode */
        emojiContainer?.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(290))
        emojiContainer?.visibility = VISIBLE
        emojiContainer?.removeAllViews()

        /* Match bottom bar bg to emoji area for uniform look */
        bottomBar.setBackgroundColor(COL_BG)

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
                cornerRadius = dp(18).toFloat()
            }
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(38)).apply {
                setMargins(dp(10), dp(10), dp(10), dp(6))
            }
            setPadding(dp(12), 0, dp(8), 0)

            /* Monochrome search icon */
            addView(ImageView(context).apply {
                val icon = KeyboardIcons.searchIcon(COL_TEXT_SEC, dp(16))
                setImageDrawable(icon)
                scaleType = ImageView.ScaleType.CENTER
                layoutParams = LayoutParams(dp(20), LayoutParams.MATCH_PARENT).apply {
                    marginEnd = dp(6)
                }
            })

            /* Search text / placeholder */
            emojiSearchTextView = TextView(context).apply {
                text = "\u041F\u043E\u0438\u0441\u043A \u044D\u043C\u043E\u0434\u0437\u0438"
                textSize = 15f
                setTextColor(0xFF8E8E93.toInt())
                gravity = Gravity.CENTER_VERTICAL
                layoutParams = LayoutParams(0, LayoutParams.MATCH_PARENT, 1f)
                isSingleLine = true
            }
            addView(emojiSearchTextView!!)

            /* Clear (X) button — hidden initially */
            emojiSearchClearBtn = ImageView(context).apply {
                val icon = KeyboardIcons.clearCircle(COL_TEXT_SEC, dp(18))
                setImageDrawable(icon)
                scaleType = ImageView.ScaleType.CENTER
                val sz = dp(30)
                layoutParams = LayoutParams(sz, sz)
                visibility = GONE
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
                            textSize = 26f
                            gravity = Gravity.CENTER
                            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f)
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
            "\u2764\uFE0F"           // 6: hearts/symbols
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

    /** Enter search mode: show keyboard + horizontal results row */
    private fun enterEmojiSearchMode() {
        isEmojiSearchMode = true
        emojiSearchQuery = ""

        /* Rebuild emojiContainer to hold: search bar + results row (no grid, no category bar) */
        emojiContainer?.removeAllViews()
        emojiContainer?.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(88))

        val searchLayout = LinearLayout(context).apply {
            orientation = VERTICAL
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        /* Search bar */
        searchLayout.addView(buildEmojiSearchBar())

        /* Horizontal results row */
        emojiSearchResultsRow = HorizontalScrollView(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dp(44))
            isHorizontalScrollBarEnabled = false
            setPadding(dp(6), 0, dp(6), dp(4))
        }
        searchLayout.addView(emojiSearchResultsRow!!)

        emojiContainer?.addView(searchLayout)

        /* Show keyboard rows */
        keysSection.visibility = VISIBLE
        actionSection.visibility = VISIBLE

        /* Swap enter icon to checkmark */
        updateEnterButtonIcon()
        updateEmojiSearchDisplay()
    }

    /** Exit search mode — return to base keyboard entirely */
    private fun exitEmojiSearchMode() {
        hideEmojiPicker()
    }

    /** Update the search display: text view, clear button, and results. */
    private fun updateEmojiSearchDisplay() {
        /* Update text view */
        if (emojiSearchQuery.isEmpty()) {
            emojiSearchTextView?.text = "\u041F\u043E\u0438\u0441\u043A \u044D\u043C\u043E\u0434\u0437\u0438"
            emojiSearchTextView?.setTextColor(0xFF8E8E93.toInt())
            emojiSearchClearBtn?.visibility = GONE
        } else {
            emojiSearchTextView?.text = emojiSearchQuery
            emojiSearchTextView?.setTextColor(COL_TEXT)
            emojiSearchClearBtn?.visibility = VISIBLE
        }

        /* Update results row */
        val resultsHost = emojiSearchResultsRow ?: return
        resultsHost.removeAllViews()

        val results = searchEmojis(emojiSearchQuery)
        if (results.isEmpty() && emojiSearchQuery.isNotEmpty()) return

        val row = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT)
        }

        val displayList = if (emojiSearchQuery.isEmpty()) getFrequentEmojis() else results
        for (emoji in displayList) {
            row.addView(TextView(context).apply {
                text = emoji
                textSize = 28f
                gravity = Gravity.CENTER
                val sz = dp(42)
                layoutParams = LayoutParams(sz, sz)
                isClickable = true; isFocusable = true
                setOnClickListener {
                    trackEmojiUsage(emoji)
                    listener?.onKeyPressed(emoji)
                }
            })
        }
        resultsHost.addView(row)
    }

    /** Update enter button icon: checkmark in search mode, return arrow otherwise. */
    private fun updateEnterButtonIcon() {
        enterBtn?.let { btn ->
            val iconSize = dp(22)
            val icon = if (isEmojiSearchMode) {
                KeyboardIcons.checkmark(COL_TEXT, iconSize)
            } else {
                KeyboardIcons.returnArrow(COL_TEXT, iconSize)
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
        m["\uD83D\uDE00"] = listOf("улыбка", "смех", "радость", "smile", "grin")
        m["\uD83D\uDE06"] = listOf("смех", "хаха", "ржу", "laugh")
        m["\uD83E\uDD23"] = listOf("ржу", "слезы", "смех", "rofl")
        m["\uD83D\uDE07"] = listOf("ангел", "нимб", "angel", "halo")
        m["\uD83D\uDE0A"] = listOf("улыбка", "румянец", "smile", "blush")
        m["\uD83D\uDE0F"] = listOf("ухмылка", "smirk")
        m["\uD83D\uDE18"] = listOf("поцелуй", "kiss", "love")
        m["\uD83D\uDE1B"] = listOf("язык", "tongue", "playful")
        m["\uD83D\uDE04"] = listOf("улыбка", "глаза", "smile", "eyes")
        m["\uD83D\uDE05"] = listOf("пот", "нервный", "sweat", "smile")
        m["\uD83D\uDE02"] = listOf("слезы", "смех", "радость", "joy", "tears")
        m["\u263A\uFE0F"] = listOf("улыбка", "smile", "relaxed")
        m["\uD83D\uDE0C"] = listOf("облегчение", "relieved", "peaceful")
        m["\uD83D\uDE0D"] = listOf("любовь", "сердца", "глаза", "heart", "love")
        m["\uD83D\uDE17"] = listOf("поцелуй", "kiss")
        m["\uD83D\uDE1C"] = listOf("подмигивание", "язык", "wink", "tongue")
        m["\uD83D\uDE03"] = listOf("улыбка", "рот", "smile", "open")
        m["\uD83E\uDD72"] = listOf("плач", "улыбка", "слеза", "tear", "smile")
        m["\uD83D\uDE42"] = listOf("улыбка", "slight", "smile")
        m["\uD83E\uDD17"] = listOf("обнимашки", "hug", "hugging")
        m["\uD83D\uDE09"] = listOf("подмигивание", "wink")
        m["\uD83E\uDD70"] = listOf("любовь", "сердца", "love", "hearts")
        m["\uD83D\uDE19"] = listOf("поцелуй", "kiss")
        m["\uD83E\uDD2A"] = listOf("сумасшедший", "безумный", "crazy", "zany")
        m["\uD83D\uDE01"] = listOf("радость", "улыбка", "grin", "beam")
        m["\uD83D\uDE22"] = listOf("грустный", "плач", "слеза", "cry", "sad")
        m["\uD83D\uDE43"] = listOf("вверх ногами", "upside", "irony")
        m["\uD83E\uDD2D"] = listOf("тайна", "рот", "secret", "oops")
        m["\uD83D\uDE0B"] = listOf("вкусно", "язык", "yummy", "delicious")
        m["\uD83D\uDE3B"] = listOf("кот", "любовь", "cat", "heart")
        m["\uD83E\uDD73"] = listOf("праздник", "вечеринка", "party", "celebrate")
        m["\uD83E\uDD28"] = listOf("подозрение", "бровь", "suspicious", "eyebrow")
        m["\uD83E\uDD13"] = listOf("ботан", "очки", "nerd", "glasses")
        m["\uD83D\uDE24"] = listOf("злость", "пар", "angry", "triumph")
        m["\uD83E\uDD25"] = listOf("ложь", "нос", "lie", "pinocchio")
        m["\uD83E\uDD78"] = listOf("маскировка", "disguise", "incognito")
        m["\uD83D\uDE08"] = listOf("дьявол", "рожки", "devil", "imp")
        m["\uD83D\uDC7F"] = listOf("злой", "демон", "demon", "angry")
        m["\uD83D\uDC80"] = listOf("череп", "смерть", "skull", "death")
        m["\u2620\uFE0F"] = listOf("череп", "кости", "skull", "bones")
        m["\uD83D\uDCA9"] = listOf("какашка", "poop")
        m["\uD83E\uDD21"] = listOf("клоун", "clown")
        m["\uD83D\uDC79"] = listOf("монстр", "огр", "ogre", "monster")
        m["\uD83D\uDC7A"] = listOf("гоблин", "goblin")
        m["\uD83D\uDC7B"] = listOf("привидение", "призрак", "ghost")
        m["\uD83D\uDC7D"] = listOf("инопланетянин", "пришелец", "alien")
        m["\uD83D\uDC7E"] = listOf("монстр", "игра", "monster", "alien")
        m["\uD83E\uDD16"] = listOf("робот", "robot")
        m["\uD83D\uDE3A"] = listOf("кот", "улыбка", "cat", "smile")
        m["\uD83D\uDE38"] = listOf("кот", "слезы", "cat", "joy")
        m["\uD83D\uDE39"] = listOf("кот", "смех", "cat", "tears")
        m["\uD83D\uDE3C"] = listOf("кот", "ухмылка", "cat", "smirk")
        m["\uD83D\uDE3D"] = listOf("кот", "поцелуй", "cat", "kiss")
        m["\uD83D\uDE40"] = listOf("кот", "испуг", "cat", "weary")
        m["\uD83D\uDE3F"] = listOf("кот", "грустный", "cat", "cry")
        m["\uD83D\uDE3E"] = listOf("кот", "злой", "cat", "angry")
        m["\uD83D\uDE48"] = listOf("обезьяна", "глаза", "monkey", "see")
        m["\uD83D\uDE49"] = listOf("обезьяна", "уши", "monkey", "hear")
        m["\uD83D\uDE4A"] = listOf("обезьяна", "рот", "monkey", "speak")
        m["\uD83D\uDC4B"] = listOf("привет", "рука", "wave", "hand", "hi")
        m["\uD83E\uDD1A"] = listOf("рука", "ладонь", "hand", "palm")
        m["\u270B"] = listOf("рука", "стоп", "hand", "stop")
        m["\uD83D\uDD96"] = listOf("вулкан", "spock", "vulcan")
        m["\uD83D\uDC4C"] = listOf("ок", "хорошо", "ok", "good")
        m["\uD83E\uDD0F"] = listOf("щепотка", "мало", "pinch", "small")
        m["\u270C\uFE0F"] = listOf("победа", "мир", "victory", "peace")
        m["\uD83E\uDD1E"] = listOf("удача", "пальцы", "luck", "fingers")
        m["\uD83E\uDD1F"] = listOf("любовь", "рука", "love", "hand")
        m["\uD83E\uDD18"] = listOf("рок", "rock", "horns")
        m["\uD83E\uDD19"] = listOf("позвони", "call", "shaka")
        m["\uD83D\uDC48"] = listOf("влево", "палец", "left", "point")
        m["\uD83D\uDC49"] = listOf("вправо", "палец", "right", "point")
        m["\uD83D\uDC46"] = listOf("вверх", "палец", "up", "point")
        m["\uD83D\uDC47"] = listOf("вниз", "палец", "down", "point")
        m["\u261D\uFE0F"] = listOf("вверх", "указатель", "up", "index")
        m["\uD83D\uDC4D"] = listOf("класс", "лайк", "палец", "thumb", "up", "like")
        m["\uD83D\uDC4E"] = listOf("плохо", "дизлайк", "палец", "thumb", "down", "dislike")
        m["\u270A"] = listOf("кулак", "fist")
        m["\uD83D\uDC4A"] = listOf("удар", "кулак", "punch", "fist")
        m["\uD83E\uDD1B"] = listOf("кулак", "влево", "fist", "left")
        m["\uD83E\uDD1C"] = listOf("кулак", "вправо", "fist", "right")
        m["\uD83D\uDC4F"] = listOf("аплодисменты", "хлопать", "clap", "applause")
        m["\uD83D\uDE4C"] = listOf("руки", "ура", "raised", "hands", "celebrate")
        m["\uD83D\uDC50"] = listOf("руки", "ладони", "open", "hands")
        m["\uD83E\uDD32"] = listOf("ладони", "вверх", "palms", "up")
        m["\uD83E\uDD1D"] = listOf("рукопожатие", "handshake", "deal")
        m["\uD83D\uDE4F"] = listOf("молитва", "спасибо", "pray", "thanks", "please")
        // ── Animals ──
        m["\uD83D\uDC36"] = listOf("собака", "пёс", "dog", "puppy")
        m["\uD83D\uDC31"] = listOf("кот", "кошка", "cat", "kitten")
        m["\uD83D\uDC2D"] = listOf("мышь", "мышка", "mouse")
        m["\uD83D\uDC39"] = listOf("хомяк", "hamster")
        m["\uD83D\uDC30"] = listOf("кролик", "заяц", "rabbit", "bunny")
        m["\uD83E\uDD8A"] = listOf("лиса", "fox")
        m["\uD83D\uDC3B"] = listOf("медведь", "bear")
        m["\uD83D\uDC3C"] = listOf("панда", "panda")
        m["\uD83D\uDC28"] = listOf("коала", "koala")
        m["\uD83D\uDC2F"] = listOf("тигр", "tiger")
        m["\uD83E\uDD81"] = listOf("лев", "lion")
        m["\uD83D\uDC2E"] = listOf("корова", "cow")
        m["\uD83D\uDC37"] = listOf("свинья", "pig")
        m["\uD83D\uDC38"] = listOf("лягушка", "жаба", "frog")
        m["\uD83D\uDC35"] = listOf("обезьяна", "monkey")
        m["\uD83D\uDC12"] = listOf("обезьяна", "monkey")
        m["\uD83D\uDC14"] = listOf("курица", "chicken", "hen")
        m["\uD83D\uDC27"] = listOf("пингвин", "penguin")
        m["\uD83D\uDC26"] = listOf("птица", "bird")
        m["\uD83D\uDC24"] = listOf("цыплёнок", "chick")
        m["\uD83D\uDC23"] = listOf("цыплёнок", "яйцо", "chick", "egg")
        m["\uD83D\uDC25"] = listOf("цыплёнок", "chick")
        m["\uD83E\uDD86"] = listOf("утка", "duck")
        m["\uD83E\uDD85"] = listOf("орёл", "eagle")
        m["\uD83E\uDD89"] = listOf("сова", "owl")
        m["\uD83E\uDD87"] = listOf("летучая мышь", "bat")
        m["\uD83D\uDC3A"] = listOf("волк", "wolf")
        m["\uD83D\uDC17"] = listOf("кабан", "boar")
        m["\uD83D\uDC34"] = listOf("лошадь", "конь", "horse")
        m["\uD83E\uDD84"] = listOf("единорог", "unicorn")
        m["\uD83D\uDC1D"] = listOf("пчела", "bee", "honey")
        m["\uD83E\uDD8B"] = listOf("бабочка", "butterfly")
        m["\uD83D\uDC0C"] = listOf("улитка", "snail")
        m["\uD83D\uDC1E"] = listOf("жук", "божья коровка", "bug", "ladybug")
        m["\uD83D\uDC1C"] = listOf("муравей", "ant")
        m["\uD83D\uDC22"] = listOf("черепаха", "turtle")
        m["\uD83D\uDC0D"] = listOf("змея", "snake")
        m["\uD83E\uDD8E"] = listOf("ящерица", "lizard")
        m["\uD83E\uDD96"] = listOf("динозавр", "dinosaur", "trex")
        m["\uD83E\uDD95"] = listOf("динозавр", "dinosaur", "sauropod")
        m["\uD83D\uDC19"] = listOf("осьминог", "octopus")
        m["\uD83E\uDD91"] = listOf("кальмар", "squid")
        m["\uD83E\uDD80"] = listOf("краб", "crab")
        m["\uD83D\uDC21"] = listOf("рыба", "тропическая", "fish", "tropical")
        m["\uD83D\uDC20"] = listOf("рыба", "тропическая", "fish", "tropical")
        m["\uD83D\uDC1F"] = listOf("рыба", "fish")
        m["\uD83D\uDC2C"] = listOf("дельфин", "dolphin")
        m["\uD83D\uDC33"] = listOf("кит", "whale")
        // ── Food ──
        m["\uD83C\uDF4E"] = listOf("яблоко", "красное", "apple", "red")
        m["\uD83C\uDF50"] = listOf("груша", "pear")
        m["\uD83C\uDF4A"] = listOf("апельсин", "мандарин", "orange", "tangerine")
        m["\uD83C\uDF4B"] = listOf("лимон", "lemon")
        m["\uD83C\uDF4C"] = listOf("банан", "banana")
        m["\uD83C\uDF49"] = listOf("арбуз", "watermelon")
        m["\uD83C\uDF47"] = listOf("виноград", "grapes")
        m["\uD83C\uDF53"] = listOf("клубника", "strawberry")
        m["\uD83C\uDF48"] = listOf("дыня", "melon")
        m["\uD83C\uDF52"] = listOf("вишня", "черешня", "cherry")
        m["\uD83C\uDF51"] = listOf("персик", "peach")
        m["\uD83C\uDF4D"] = listOf("ананас", "pineapple")
        m["\uD83E\uDD5D"] = listOf("киви", "kiwi")
        m["\uD83C\uDF45"] = listOf("помидор", "томат", "tomato")
        m["\uD83E\uDD51"] = listOf("авокадо", "avocado")
        m["\uD83C\uDF46"] = listOf("баклажан", "eggplant")
        m["\uD83E\uDD52"] = listOf("огурец", "cucumber")
        m["\uD83E\uDD66"] = listOf("брокколи", "broccoli")
        m["\uD83C\uDF44"] = listOf("гриб", "mushroom")
        m["\uD83C\uDF5E"] = listOf("хлеб", "bread")
        m["\uD83E\uDD50"] = listOf("круассан", "croissant")
        m["\uD83E\uDD56"] = listOf("багет", "хлеб", "baguette")
        m["\uD83E\uDDC0"] = listOf("сыр", "cheese")
        m["\uD83C\uDF56"] = listOf("мясо", "кость", "meat", "bone")
        m["\uD83C\uDF57"] = listOf("курица", "ножка", "poultry", "leg")
        m["\uD83E\uDD69"] = listOf("стейк", "мясо", "steak", "meat")
        m["\uD83C\uDF54"] = listOf("бургер", "гамбургер", "burger", "hamburger")
        m["\uD83C\uDF5F"] = listOf("картошка", "фри", "fries", "french")
        m["\uD83C\uDF55"] = listOf("пицца", "pizza")
        m["\uD83C\uDF2D"] = listOf("хотдог", "сосиска", "hotdog")
        m["\uD83E\uDD6A"] = listOf("сэндвич", "бутерброд", "sandwich")
        m["\uD83C\uDF2E"] = listOf("тако", "taco")
        m["\uD83C\uDF2F"] = listOf("буррито", "burrito")
        m["\uD83E\uDD59"] = listOf("лаваш", "шаурма", "wrap", "pita")
        m["\uD83C\uDF73"] = listOf("яйцо", "яичница", "egg", "cooking")
        m["\uD83E\uDD58"] = listOf("рагу", "каша", "pot", "stew")
        m["\uD83C\uDF72"] = listOf("суп", "soup", "bowl")
        m["\uD83E\uDD63"] = listOf("миска", "салат", "bowl")
        m["\uD83E\uDD57"] = listOf("салат", "salad", "green")
        m["\uD83C\uDF7F"] = listOf("попкорн", "popcorn")
        // ── Sports ──
        m["\u26BD"] = listOf("футбол", "мяч", "soccer", "football")
        m["\uD83C\uDFC0"] = listOf("баскетбол", "basketball")
        m["\uD83C\uDFC8"] = listOf("американский футбол", "football")
        m["\u26BE"] = listOf("бейсбол", "baseball")
        m["\uD83C\uDFBE"] = listOf("теннис", "tennis")
        m["\uD83C\uDFD0"] = listOf("волейбол", "volleyball")
        m["\uD83C\uDFC9"] = listOf("регби", "rugby")
        m["\uD83C\uDFB1"] = listOf("бильярд", "pool", "billiards")
        m["\uD83C\uDFD3"] = listOf("пинг-понг", "настольный теннис", "ping-pong")
        m["\uD83C\uDFF8"] = listOf("бадминтон", "badminton")
        m["\uD83C\uDFD2"] = listOf("хоккей", "hockey")
        m["\uD83C\uDFCF"] = listOf("крикет", "cricket")
        m["\u26F3"] = listOf("гольф", "golf")
        m["\uD83C\uDFF9"] = listOf("лук", "стрельба", "bow", "archery")
        m["\uD83C\uDFA3"] = listOf("рыбалка", "удочка", "fishing")
        m["\uD83E\uDD4A"] = listOf("бокс", "boxing", "glove")
        m["\uD83E\uDD4B"] = listOf("боевые искусства", "карате", "martial")
        m["\uD83C\uDFBD"] = listOf("лакросс", "lacrosse")
        m["\uD83C\uDFBF"] = listOf("лыжи", "ski", "skiing")
        m["\uD83C\uDFC2"] = listOf("сноуборд", "snowboard")
        m["\uD83C\uDFC4"] = listOf("сёрфинг", "surfing")
        m["\uD83C\uDFCA"] = listOf("плавание", "swimming")
        m["\uD83E\uDD3D"] = listOf("водное поло", "water polo")
        m["\uD83D\uDEB4"] = listOf("велосипед", "cycling", "bike")
        // ── Travel ──
        m["\uD83D\uDE97"] = listOf("машина", "авто", "car", "auto")
        m["\uD83D\uDE95"] = listOf("такси", "taxi", "cab")
        m["\uD83D\uDE99"] = listOf("внедорожник", "джип", "suv")
        m["\uD83D\uDE8C"] = listOf("автобус", "bus")
        m["\uD83D\uDE93"] = listOf("полиция", "police")
        m["\uD83D\uDE91"] = listOf("скорая", "ambulance")
        m["\uD83D\uDE92"] = listOf("пожарная", "fire", "truck")
        m["\uD83D\uDE9A"] = listOf("грузовик", "фура", "truck")
        m["\uD83D\uDE9B"] = listOf("фура", "грузовик", "truck")
        m["\uD83D\uDE9C"] = listOf("трактор", "tractor")
        m["\uD83D\uDEB2"] = listOf("велосипед", "bicycle", "bike")
        m["\uD83D\uDE94"] = listOf("полиция", "police")
        m["\uD83D\uDE8D"] = listOf("автобус", "bus")
        m["\uD83D\uDE98"] = listOf("машина", "car")
        m["\uD83D\uDE84"] = listOf("поезд", "скорый", "train", "bullet")
        m["\uD83D\uDE85"] = listOf("поезд", "скорый", "train", "bullet")
        m["\uD83D\uDE82"] = listOf("поезд", "вагон", "train", "locomotive")
        m["\uD83D\uDE86"] = listOf("поезд", "train")
        m["\uD83D\uDE87"] = listOf("метро", "metro", "subway")
        m["\uD83D\uDE89"] = listOf("станция", "вокзал", "station")
        m["\u2708\uFE0F"] = listOf("самолёт", "airplane", "plane")
        m["\uD83D\uDEEB"] = listOf("самолёт", "взлёт", "airplane", "departure")
        m["\uD83D\uDE80"] = listOf("ракета", "космос", "rocket", "space")
        m["\uD83D\uDE81"] = listOf("вертолёт", "helicopter")
        // ── Hearts & Symbols ──
        m["\u2764\uFE0F"] = listOf("сердце", "красное", "любовь", "heart", "red", "love")
        m["\uD83E\uDDE1"] = listOf("сердце", "оранжевое", "heart", "orange")
        m["\uD83D\uDC9B"] = listOf("сердце", "жёлтое", "heart", "yellow")
        m["\uD83D\uDC9A"] = listOf("сердце", "зелёное", "heart", "green")
        m["\uD83D\uDC99"] = listOf("сердце", "синее", "heart", "blue")
        m["\uD83D\uDC9C"] = listOf("сердце", "фиолетовое", "heart", "purple")
        m["\uD83D\uDDA4"] = listOf("сердце", "чёрное", "heart", "black")
        m["\uD83E\uDD0D"] = listOf("сердце", "белое", "heart", "white")
        m["\uD83E\uDD0E"] = listOf("сердце", "коричневое", "heart", "brown")
        m["\uD83D\uDC94"] = listOf("сердце", "разбитое", "broken", "heart")
        m["\u2763\uFE0F"] = listOf("сердце", "восклицание", "heart", "exclamation")
        m["\uD83D\uDC95"] = listOf("сердца", "hearts", "two")
        m["\uD83D\uDC9E"] = listOf("сердца", "вращающиеся", "revolving", "hearts")
        m["\uD83D\uDC93"] = listOf("сердце", "бьющееся", "heartbeat")
        m["\uD83D\uDC97"] = listOf("сердце", "растущее", "growing", "heart")
        m["\uD83D\uDC96"] = listOf("сердце", "искры", "sparkling", "heart")
        m["\uD83D\uDC9D"] = listOf("сердце", "лента", "ribbon", "heart")
        m["\uD83D\uDC98"] = listOf("сердце", "стрела", "arrow", "cupid")
        m["\uD83D\uDC8C"] = listOf("письмо", "любовь", "love", "letter")
        m["\uD83D\uDD34"] = listOf("круг", "красный", "circle", "red")
        m["\uD83D\uDFE0"] = listOf("круг", "оранжевый", "circle", "orange")
        m["\uD83D\uDFE1"] = listOf("круг", "жёлтый", "circle", "yellow")
        m["\uD83D\uDFE2"] = listOf("круг", "зелёный", "circle", "green")
        m["\uD83D\uDD35"] = listOf("круг", "синий", "circle", "blue")
        m["\uD83D\uDFE3"] = listOf("круг", "фиолетовый", "circle", "purple")
        m["\u26AB"] = listOf("круг", "чёрный", "circle", "black")
        m["\u26AA"] = listOf("круг", "белый", "circle", "white")
        m["\uD83D\uDFE4"] = listOf("круг", "коричневый", "circle", "brown")
        m["\uD83D\uDD3A"] = listOf("треугольник", "вверх", "triangle", "up", "red")
        m["\uD83D\uDD3B"] = listOf("треугольник", "вниз", "triangle", "down", "red")
        m["\uD83D\uDD38"] = listOf("ромб", "маленький", "diamond", "small", "orange")
        m["\uD83D\uDD39"] = listOf("ромб", "маленький", "diamond", "small", "blue")
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
        if (isEmojiMode) hideEmojiPicker()
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
