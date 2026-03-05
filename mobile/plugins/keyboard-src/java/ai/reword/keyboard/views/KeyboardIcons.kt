/**
 * KeyboardIcons — Programmatic monochrome vector icons for the keyboard.
 * Replaces colourful emoji (🌐 🎤 😊) with clean Apple-style line icons
 * drawn via Canvas/Paint/Path so they look identical on every device.
 */

package ai.reword.keyboard.views

import android.graphics.*
import android.graphics.drawable.Drawable

object KeyboardIcons {

    /* -------- Globe (language toggle) -------- */
    fun globe(color: Int, sizePx: Int): Drawable = object : Drawable() {
        private val p = strokePaint(color, sizePx * 0.07f)

        override fun draw(canvas: Canvas) {
            val s = bounds.width().toFloat().coerceAtMost(bounds.height().toFloat())
            val cx = bounds.exactCenterX(); val cy = bounds.exactCenterY()
            val r = s * 0.40f

            // outer circle
            canvas.drawCircle(cx, cy, r, p)
            // equator
            canvas.drawLine(cx - r, cy, cx + r, cy, p)
            // vertical meridian (ellipse)
            val oval = RectF(cx - r * 0.45f, cy - r, cx + r * 0.45f, cy + r)
            canvas.drawOval(oval, p)
        }

        override fun setAlpha(a: Int) { p.alpha = a }
        override fun setColorFilter(cf: ColorFilter?) { p.colorFilter = cf }
        @Suppress("OVERRIDE_DEPRECATION")
        override fun getOpacity() = PixelFormat.TRANSLUCENT
        override fun getIntrinsicWidth() = sizePx
        override fun getIntrinsicHeight() = sizePx
    }

    /* -------- Microphone (voice input) --------
     * Tall vertically-stretched capsule (oval, NOT a circle) matching
     * the standard iOS / Gboard microphone icon.  The capsule height
     * is ~2.2× its width so it reads as a slender pill. */
    fun microphone(color: Int, sizePx: Int): Drawable = object : Drawable() {
        private val p = strokePaint(color, sizePx * 0.07f)

        override fun draw(canvas: Canvas) {
            val s = bounds.width().toFloat().coerceAtMost(bounds.height().toFloat())
            val cx = bounds.exactCenterX(); val cy = bounds.exactCenterY()

            // ── Capsule (tall oval, ~2.5:1 aspect like iOS mic) ──
            val capHalfW = s * 0.105f          // narrower
            val capH     = s * 0.52f           // taller pill
            val capTop   = cy - s * 0.38f
            val capBot   = capTop + capH
            val capRect  = RectF(cx - capHalfW, capTop, cx + capHalfW, capBot)
            canvas.drawRoundRect(capRect, capHalfW, capHalfW, p)

            // ── U-shaped holder arc ──
            val arcHalfW = s * 0.22f
            val arcTop   = capTop + capH * 0.40f
            val arcBot   = capBot + s * 0.06f
            val arcRect  = RectF(cx - arcHalfW, arcTop, cx + arcHalfW, arcBot)
            canvas.drawArc(arcRect, 0f, 180f, false, p)

            // ── Stem ──
            val stemTop = arcBot
            val stemBot = stemTop + s * 0.10f
            canvas.drawLine(cx, stemTop, cx, stemBot, p)

            // ── Base ──
            val baseHalf = s * 0.11f
            canvas.drawLine(cx - baseHalf, stemBot, cx + baseHalf, stemBot, p)
        }

        override fun setAlpha(a: Int) { p.alpha = a }
        override fun setColorFilter(cf: ColorFilter?) { p.colorFilter = cf }
        @Suppress("OVERRIDE_DEPRECATION")
        override fun getOpacity() = PixelFormat.TRANSLUCENT
        override fun getIntrinsicWidth() = sizePx
        override fun getIntrinsicHeight() = sizePx
    }

    /* -------- Smiley face (emoji picker toggle) -------- */
    fun smiley(color: Int, sizePx: Int): Drawable = object : Drawable() {
        private val p = strokePaint(color, sizePx * 0.07f)
        private val fillP = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color; style = Paint.Style.FILL
        }

        override fun draw(canvas: Canvas) {
            val s = bounds.width().toFloat().coerceAtMost(bounds.height().toFloat())
            val cx = bounds.exactCenterX(); val cy = bounds.exactCenterY()
            val r = s * 0.40f

            // face outline
            canvas.drawCircle(cx, cy, r, p)
            // left eye
            canvas.drawCircle(cx - r * 0.33f, cy - r * 0.18f, s * 0.04f, fillP)
            // right eye
            canvas.drawCircle(cx + r * 0.33f, cy - r * 0.18f, s * 0.04f, fillP)
            // smile arc
            val smileRect = RectF(cx - r * 0.50f, cy - r * 0.10f, cx + r * 0.50f, cy + r * 0.55f)
            canvas.drawArc(smileRect, 15f, 150f, false, p)
        }

        override fun setAlpha(a: Int) { p.alpha = a; fillP.alpha = a }
        override fun setColorFilter(cf: ColorFilter?) { p.colorFilter = cf; fillP.colorFilter = cf }
        @Suppress("OVERRIDE_DEPRECATION")
        override fun getOpacity() = PixelFormat.TRANSLUCENT
        override fun getIntrinsicWidth() = sizePx
        override fun getIntrinsicHeight() = sizePx
    }

    /* -------- Sparkle / AI star (AI menu button) -------- */
    fun sparkle(color: Int, sizePx: Int): Drawable = object : Drawable() {
        private val fillP = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color; style = Paint.Style.FILL
        }

        override fun draw(canvas: Canvas) {
            val s = bounds.width().toFloat().coerceAtMost(bounds.height().toFloat())
            val cx = bounds.exactCenterX(); val cy = bounds.exactCenterY()
            val r = s * 0.40f
            val inner = r * 0.30f

            val path = Path()
            for (i in 0 until 4) {
                val angle = Math.toRadians((i * 90 - 90).toDouble())
                val midAngle = Math.toRadians((i * 90 - 45).toDouble())

                if (i == 0) {
                    path.moveTo(cx + (r * Math.cos(angle)).toFloat(),
                                cy + (r * Math.sin(angle)).toFloat())
                } else {
                    path.lineTo(cx + (r * Math.cos(angle)).toFloat(),
                                cy + (r * Math.sin(angle)).toFloat())
                }
                val nextAngle = Math.toRadians(((i + 1) * 90 - 90).toDouble())
                path.lineTo(cx + (inner * Math.cos(midAngle)).toFloat(),
                            cy + (inner * Math.sin(midAngle)).toFloat())
            }
            path.close()
            canvas.drawPath(path, fillP)
        }

        override fun setAlpha(a: Int) { fillP.alpha = a }
        override fun setColorFilter(cf: ColorFilter?) { fillP.colorFilter = cf }
        @Suppress("OVERRIDE_DEPRECATION")
        override fun getOpacity() = PixelFormat.TRANSLUCENT
        override fun getIntrinsicWidth() = sizePx
        override fun getIntrinsicHeight() = sizePx
    }

    /* -------- Checkmark (instant check) -------- */
    fun checkmark(color: Int, sizePx: Int): Drawable = object : Drawable() {
        private val p = strokePaint(color, sizePx * 0.09f)

        override fun draw(canvas: Canvas) {
            val s = bounds.width().toFloat().coerceAtMost(bounds.height().toFloat())
            val cx = bounds.exactCenterX(); val cy = bounds.exactCenterY()
            val r = s * 0.32f

            val path = Path().apply {
                moveTo(cx - r * 0.85f, cy + r * 0.05f)
                lineTo(cx - r * 0.15f, cy + r * 0.70f)
                lineTo(cx + r * 1.00f, cy - r * 0.65f)
            }
            canvas.drawPath(path, p)
        }

        override fun setAlpha(a: Int) { p.alpha = a }
        override fun setColorFilter(cf: ColorFilter?) { p.colorFilter = cf }
        @Suppress("OVERRIDE_DEPRECATION")
        override fun getOpacity() = PixelFormat.TRANSLUCENT
        override fun getIntrinsicWidth() = sizePx
        override fun getIntrinsicHeight() = sizePx
    }

    /* -------- Return / Enter arrow -------- */
    fun returnArrow(color: Int, sizePx: Int): Drawable = object : Drawable() {
        private val p = strokePaint(color, sizePx * 0.09f)

        override fun draw(canvas: Canvas) {
            val s = bounds.width().toFloat().coerceAtMost(bounds.height().toFloat())
            val cx = bounds.exactCenterX(); val cy = bounds.exactCenterY()

            // vertical line (right side going down)
            val rightX = cx + s * 0.22f
            val topY = cy - s * 0.22f
            val midY = cy + s * 0.10f
            canvas.drawLine(rightX, topY, rightX, midY, p)

            // horizontal line going left
            val leftX = cx - s * 0.28f
            canvas.drawLine(rightX, midY, leftX, midY, p)

            // arrowhead
            val arrowSize = s * 0.14f
            canvas.drawLine(leftX, midY, leftX + arrowSize, midY - arrowSize, p)
            canvas.drawLine(leftX, midY, leftX + arrowSize, midY + arrowSize, p)
        }

        override fun setAlpha(a: Int) { p.alpha = a }
        override fun setColorFilter(cf: ColorFilter?) { p.colorFilter = cf }
        @Suppress("OVERRIDE_DEPRECATION")
        override fun getOpacity() = PixelFormat.TRANSLUCENT
        override fun getIntrinsicWidth() = sizePx
        override fun getIntrinsicHeight() = sizePx
    }

    /* -------- Backspace / Delete -------- */
    fun backspace(color: Int, sizePx: Int): Drawable = object : Drawable() {
        private val p = strokePaint(color, sizePx * 0.07f)

        override fun draw(canvas: Canvas) {
            val s = bounds.width().toFloat().coerceAtMost(bounds.height().toFloat())
            val cx = bounds.exactCenterX(); val cy = bounds.exactCenterY()

            val h = s * 0.36f
            val w = s * 0.44f
            val tipX = cx - w - s * 0.04f

            // body outline (pentagon with pointed left side)
            val path = Path().apply {
                moveTo(cx + w, cy - h)           // top-right
                lineTo(cx - w * 0.20f, cy - h)   // top-left of body
                lineTo(tipX, cy)                   // left point
                lineTo(cx - w * 0.20f, cy + h)   // bottom-left of body
                lineTo(cx + w, cy + h)            // bottom-right
                close()
            }
            canvas.drawPath(path, p)

            // × inside
            val xr = s * 0.12f
            val xCx = cx + s * 0.06f
            canvas.drawLine(xCx - xr, cy - xr, xCx + xr, cy + xr, p)
            canvas.drawLine(xCx + xr, cy - xr, xCx - xr, cy + xr, p)
        }

        override fun setAlpha(a: Int) { p.alpha = a }
        override fun setColorFilter(cf: ColorFilter?) { p.colorFilter = cf }
        @Suppress("OVERRIDE_DEPRECATION")
        override fun getOpacity() = PixelFormat.TRANSLUCENT
        override fun getIntrinsicWidth() = sizePx
        override fun getIntrinsicHeight() = sizePx
    }

    /* -------- Shift arrow (bold, prominent — matches return arrow weight) -------- */
    fun shiftArrow(color: Int, sizePx: Int, filled: Boolean = false): Drawable = object : Drawable() {
        private val p = if (filled) {
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = color; style = Paint.Style.FILL_AND_STROKE
                strokeWidth = sizePx * 0.04f; strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND
            }
        } else Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color; style = Paint.Style.STROKE
            strokeWidth = sizePx * 0.10f   // thicker stroke for bold look
            strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND
        }

        override fun draw(canvas: Canvas) {
            val s = bounds.width().toFloat().coerceAtMost(bounds.height().toFloat())
            val cx = bounds.exactCenterX(); val cy = bounds.exactCenterY()

            val path = Path().apply {
                moveTo(cx, cy - s * 0.35f)              // top point
                lineTo(cx + s * 0.32f, cy + s * 0.04f)  // right wing
                lineTo(cx + s * 0.18f, cy + s * 0.04f)  // inner right
                lineTo(cx + s * 0.18f, cy + s * 0.32f)  // bottom right
                lineTo(cx - s * 0.18f, cy + s * 0.32f)  // bottom left
                lineTo(cx - s * 0.18f, cy + s * 0.04f)  // inner left
                lineTo(cx - s * 0.32f, cy + s * 0.04f)  // left wing
                close()
            }
            canvas.drawPath(path, p)
        }

        override fun setAlpha(a: Int) { p.alpha = a }
        override fun setColorFilter(cf: ColorFilter?) { p.colorFilter = cf }
        @Suppress("OVERRIDE_DEPRECATION")
        override fun getOpacity() = PixelFormat.TRANSLUCENT
        override fun getIntrinsicWidth() = sizePx
        override fun getIntrinsicHeight() = sizePx
    }

    /* -------- helper -------- */
    private fun strokePaint(color: Int, width: Float) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        this.color = color
        style = Paint.Style.STROKE
        strokeWidth = width
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }

    /* -------- Search magnifying glass (emoji search) --------
     * Clean iOS-style: circle + handle at ~45°, thin stroke. */
    fun searchIcon(color: Int, sizePx: Int): Drawable = object : Drawable() {
        private val p = strokePaint(color, sizePx * 0.10f)

        override fun draw(canvas: Canvas) {
            val s = bounds.width().toFloat().coerceAtMost(bounds.height().toFloat())
            val cx = bounds.exactCenterX(); val cy = bounds.exactCenterY()

            // Lens — centred slightly up-left so the handle points to bottom-right
            val lensR = s * 0.28f
            val lensCx = cx - s * 0.05f
            val lensCy = cy - s * 0.05f
            canvas.drawCircle(lensCx, lensCy, lensR, p)

            // Handle — starts at the circle edge at 45° and extends outward
            val cos45 = 0.707f
            val hx0 = lensCx + lensR * cos45
            val hy0 = lensCy + lensR * cos45
            val hLen = s * 0.20f
            canvas.drawLine(hx0, hy0, hx0 + hLen * cos45, hy0 + hLen * cos45, p)
        }

        override fun setAlpha(a: Int) { p.alpha = a }
        override fun setColorFilter(cf: ColorFilter?) { p.colorFilter = cf }
        @Suppress("OVERRIDE_DEPRECATION")
        override fun getOpacity() = PixelFormat.TRANSLUCENT
        override fun getIntrinsicWidth() = sizePx
        override fun getIntrinsicHeight() = sizePx
    }

    /* -------- Clear circle (⊗ — for clearing search input) -------- */
    fun clearCircle(color: Int, sizePx: Int): Drawable = object : Drawable() {
        private val fillP = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color; style = Paint.Style.FILL; alpha = 140
        }
        private val xP = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = Color.WHITE; style = Paint.Style.STROKE
            strokeWidth = sizePx * 0.10f; strokeCap = Paint.Cap.ROUND
        }

        override fun draw(canvas: Canvas) {
            val s = bounds.width().toFloat().coerceAtMost(bounds.height().toFloat())
            val cx = bounds.exactCenterX(); val cy = bounds.exactCenterY()
            val r = s * 0.40f

            // Filled circle background
            canvas.drawCircle(cx, cy, r, fillP)

            // ✕ cross inside
            val xr = r * 0.40f
            canvas.drawLine(cx - xr, cy - xr, cx + xr, cy + xr, xP)
            canvas.drawLine(cx + xr, cy - xr, cx - xr, cy + xr, xP)
        }

        override fun setAlpha(a: Int) { fillP.alpha = a; xP.alpha = a }
        override fun setColorFilter(cf: ColorFilter?) { fillP.colorFilter = cf; xP.colorFilter = cf }
        @Suppress("OVERRIDE_DEPRECATION")
        override fun getOpacity() = PixelFormat.TRANSLUCENT
        override fun getIntrinsicWidth() = sizePx
        override fun getIntrinsicHeight() = sizePx
    }
}
