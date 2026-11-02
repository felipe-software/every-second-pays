package expo.modules.jellytabs

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.view.View

// React Native shrinks a bordered background by this much so the border overlaps it.
private const val BACKGROUND_INSET_PX = 0.8f

internal class JellyTrackSurfaceView(context: Context) : View(context) {
  private val borderWidth = BORDER_WIDTH_DP * resources.displayMetrics.density
  private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.STROKE
    strokeWidth = borderWidth
  }
  private val fillRect = RectF()
  private val strokeRect = RectF()
  private var radius = 0f

  fun setSurfaceColor(color: Int) {
    fillPaint.color = color
    invalidate()
  }

  fun setOutlineColor(color: Int) {
    strokePaint.color = color
    invalidate()
  }

  override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
    radius = height / 2f
    fillRect.set(
      BACKGROUND_INSET_PX,
      BACKGROUND_INSET_PX,
      width - BACKGROUND_INSET_PX,
      height - BACKGROUND_INSET_PX,
    )
    val halfBorder = borderWidth / 2f
    strokeRect.set(halfBorder, halfBorder, width - halfBorder, height - halfBorder)
  }

  override fun onDraw(canvas: Canvas) {
    canvas.drawRoundRect(fillRect, radius, radius, fillPaint)
    val strokeRadius = radius - borderWidth / 2f
    canvas.drawRoundRect(strokeRect, strokeRadius, strokeRadius, strokePaint)
  }

  override fun hasOverlappingRendering() = false
}
