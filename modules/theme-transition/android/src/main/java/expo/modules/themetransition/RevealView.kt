package expo.modules.themetransition

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Path
import android.graphics.Region
import android.os.Build
import android.view.View
import kotlin.math.hypot

@SuppressLint("ViewConstructor")
internal class RevealView(context: Context, private var frame: RevealFrame?) : View(context) {
  private val hole = Path()
  private var holeX = 0f
  private var holeY = 0f
  private var holeMaxRadius = 0f

  var progress = 0f
    set(value) {
      field = value
      invalidate()
    }

  init {
    isClickable = false
    isFocusable = false
    setWillNotDraw(false)
  }

  override fun hasOverlappingRendering() = false

  fun show(next: RevealFrame) {
    if (frame === next) return
    next.retain()
    frame?.release()
    frame = next
    invalidate()
  }

  fun aim(x: Float, y: Float) {
    val current = frame ?: return
    holeX = x
    holeY = y
    val right = current.width - x
    val bottom = current.height - y
    holeMaxRadius = maxOf(hypot(x, y), hypot(right, y), hypot(x, bottom), hypot(right, bottom))
  }

  fun release() {
    frame?.release()
    frame = null
  }

  override fun onDraw(canvas: Canvas) {
    val bitmap = frame?.bitmap ?: return
    if (bitmap.isRecycled) return
    if (!canvas.isHardwareAccelerated && bitmap.config == Bitmap.Config.HARDWARE) return

    val save = canvas.save()
    val radius = holeMaxRadius * progress
    if (radius > 0f) {
      hole.rewind()
      hole.addCircle(holeX, holeY, radius, Path.Direction.CW)
      clipOut(canvas)
    }
    canvas.drawBitmap(bitmap, 0f, 0f, null)
    canvas.restoreToCount(save)
  }

  @Suppress("DEPRECATION")
  private fun clipOut(canvas: Canvas) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      canvas.clipOutPath(hole)
    } else {
      canvas.clipPath(hole, Region.Op.DIFFERENCE)
    }
  }
}
