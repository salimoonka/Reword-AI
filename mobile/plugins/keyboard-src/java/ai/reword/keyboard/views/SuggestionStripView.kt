/**
 * SuggestionStripView – kept for backward compatibility.
 * KeyboardView now renders suggestions inline in its toolbar.
 */

package ai.reword.keyboard.views

import android.content.Context
import android.util.AttributeSet
import android.widget.HorizontalScrollView

interface SuggestionStripListener {
    fun onSuggestionSelected(suggestion: String)
}

class SuggestionStripView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : HorizontalScrollView(context, attrs, defStyleAttr) {

    var listener: SuggestionStripListener? = null

    fun updateSuggestions(suggestions: List<String>) {}
    fun clearSuggestions() {}
    fun getSuggestions(): List<String> = emptyList()
}
