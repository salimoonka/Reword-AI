/**
 * PreviewPanelView – Floating panel showing paraphrase results
 * Displayed in place of the keyboard when AI returns a result.
 */

package ai.reword.keyboard.views

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.BackgroundColorSpan
import android.text.style.ForegroundColorSpan
import android.text.style.StrikethroughSpan
import android.util.AttributeSet
import android.view.Gravity
import android.view.View
import android.widget.*
import ai.reword.keyboard.models.ParaphraseResult
import ai.reword.keyboard.models.DiffSegment
import ai.reword.keyboard.models.DiffType

class PreviewPanelView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    var onConfirm: ((String) -> Unit)? = null
    var onCancel: (() -> Unit)? = null
    var onCopy: ((String) -> Unit)? = null

    private var result: ParaphraseResult? = null
    private var isShowingOriginal = false

    private lateinit var textView: TextView

    private val delFg   = Color.parseColor("#E35A5A")
    private val delBg   = Color.parseColor("#4DE35A5A")
    private val insFg   = Color.parseColor("#39C07C")
    private val insBg   = Color.parseColor("#4D39C07C")
    private val accent  = Color.parseColor("#9B6DFF")
    private val bgColor = Color.parseColor("#1B1B1D")
    private val cardBg  = Color.parseColor("#2C2C2E")

    private fun dp(v: Int) = (v * resources.displayMetrics.density + 0.5f).toInt()

    init { setupView() }

    private fun setupView() {
        orientation = VERTICAL
        setBackgroundColor(bgColor)
        setPadding(dp(16), dp(12), dp(16), dp(12))

        /* handle bar */
        addView(View(context).apply {
            layoutParams = LayoutParams(dp(40), dp(4)).apply {
                gravity = Gravity.CENTER_HORIZONTAL; bottomMargin = dp(10)
            }
            background = GradientDrawable().apply {
                setColor(0x4DFFFFFF); cornerRadius = dp(2).toFloat()
            }
        })

        /* scrollable text */
        val scroll = ScrollView(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f)
        }
        textView = TextView(context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
            setTextColor(Color.WHITE); textSize = 16f
            setPadding(dp(8), dp(8), dp(8), dp(8))
        }
        scroll.addView(textView)
        addView(scroll)

        /* button row */
        val btnRow = LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
                topMargin = dp(12)
            }
            gravity = Gravity.CENTER_VERTICAL
        }

        /* Undo (toggle) */
        btnRow.addView(makeBtn("↩", dp(44), dp(40), cardBg) {
            toggleOriginalText()
        })

        /* Copy */
        btnRow.addView(makeBtn("📋", dp(44), dp(40), cardBg) {
            result?.outputText?.let { onCopy?.invoke(it) }
        })

        /* Cancel */
        btnRow.addView(Button(context).apply {
            text = "Отмена"; textSize = 14f; setTextColor(Color.WHITE); isAllCaps = false
            background = GradientDrawable().apply { setColor(cardBg); cornerRadius = dp(8).toFloat() }
            layoutParams = LayoutParams(0, dp(40), 1f).apply { setMargins(dp(6),0,dp(4),0) }
            setPadding(0,0,0,0); minWidth = 0; minHeight = 0
            setOnClickListener { onCancel?.invoke() }
        })

        /* Confirm */
        btnRow.addView(Button(context).apply {
            text = "Применить"; textSize = 14f; setTextColor(Color.WHITE); isAllCaps = false
            background = GradientDrawable().apply { setColor(accent); cornerRadius = dp(8).toFloat() }
            layoutParams = LayoutParams(0, dp(40), 1f).apply { setMargins(dp(4),0,0,0) }
            setPadding(0,0,0,0); minWidth = 0; minHeight = 0
            setOnClickListener { result?.outputText?.let { onConfirm?.invoke(it) } }
        })

        addView(btnRow)
    }

    private fun makeBtn(label: String, w: Int, h: Int, bg: Int, click: () -> Unit): Button {
        return Button(context).apply {
            text = label; textSize = 16f; setTextColor(Color.WHITE); isAllCaps = false
            background = GradientDrawable().apply { setColor(bg); cornerRadius = dp(8).toFloat() }
            layoutParams = LayoutParams(w, h).apply { setMargins(0,0,dp(4),0) }
            setPadding(0,0,0,0); minWidth = 0; minHeight = 0
            setOnClickListener { click() }
        }
    }

    fun setResult(r: ParaphraseResult) {
        result = r; isShowingOriginal = false; displayDiff(r.diff)
    }

    private fun toggleOriginalText() {
        result?.let {
            isShowingOriginal = !isShowingOriginal
            if (isShowingOriginal) textView.text = it.inputText
            else displayDiff(it.diff)
        }
    }

    private fun displayDiff(diff: List<DiffSegment>) {
        val b = SpannableStringBuilder()
        for (seg in diff) {
            val s = b.length; b.append(seg.text); val e = b.length
            when (seg.type) {
                DiffType.DELETED -> {
                    b.setSpan(ForegroundColorSpan(delFg), s, e, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    b.setSpan(BackgroundColorSpan(delBg), s, e, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    b.setSpan(StrikethroughSpan(), s, e, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                DiffType.INSERTED -> {
                    b.setSpan(ForegroundColorSpan(insFg), s, e, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                    b.setSpan(BackgroundColorSpan(insBg), s, e, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                DiffType.UNCHANGED, null -> {}
            }
        }
        textView.text = b
    }
}
