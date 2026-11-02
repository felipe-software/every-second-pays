package expo.modules.jellytabs

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Outline
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import kotlin.math.min

private const val GLOW_CENTER_ALPHA = 38
private const val GLOW_MIDDLE_ALPHA = 16
private const val GLOW_MIDDLE_STOP = 0.45f

// Children are placed by hand and moved through render properties, so nothing here records per frame.
internal open class JellyLayerView(context: Context) : ViewGroup(context) {
  init {
    clipChildren = false
    clipToPadding = false
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) = Unit

  override fun hasOverlappingRendering() = false

  fun clipToPill() {
    outlineProvider = PillOutlineProvider
    clipToOutline = true
  }
}

private object PillOutlineProvider : ViewOutlineProvider() {
  override fun getOutline(view: View, outline: Outline) {
    outline.setRoundRect(0, 0, view.width, view.height, min(view.width, view.height) / 2f)
  }
}

internal class JellyGlowView(context: Context, private val radius: Float) : View(context) {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

  init {
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    alpha = 0f
  }

  fun setGlowColor(color: Int) {
    paint.shader = RadialGradient(
      radius,
      radius,
      radius,
      intArrayOf(withAlpha(color, GLOW_CENTER_ALPHA), withAlpha(color, GLOW_MIDDLE_ALPHA), withAlpha(color, 0)),
      floatArrayOf(0f, GLOW_MIDDLE_STOP, 1f),
      Shader.TileMode.CLAMP,
    )
    invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    canvas.drawRect(0f, 0f, radius * 2f, radius * 2f, paint)
  }

  override fun hasOverlappingRendering() = false

  private fun withAlpha(color: Int, alpha: Int) =
    Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color))
}
