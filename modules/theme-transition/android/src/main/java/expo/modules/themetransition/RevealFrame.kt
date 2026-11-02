package expo.modules.themetransition

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.ColorSpace
import android.graphics.HardwareRenderer
import android.graphics.PixelFormat
import android.graphics.RenderNode
import android.hardware.HardwareBuffer
import android.media.Image
import android.media.ImageReader
import android.os.Build
import android.view.View
import androidx.annotation.RequiresApi

private const val LIGHT_Y_DP = 600f
private const val LIGHT_Z_DP = 600f
private const val LIGHT_RADIUS_DP = 800f
private const val AMBIENT_SHADOW_ALPHA = 0.039f
private const val SPOT_SHADOW_ALPHA = 0.19f

internal class RevealFrame(
  val bitmap: Bitmap,
  private val surface: CaptureSurface?,
  val width: Int,
  val height: Int,
) {
  private var holders = 1

  fun retain(): RevealFrame {
    holders += 1
    return this
  }

  fun release() {
    holders -= 1
    if (holders > 0) return
    if (!bitmap.isRecycled) bitmap.recycle()
    surface?.close()
  }

  companion object {
    fun capture(view: View, width: Int, height: Int): RevealFrame? {
      if (width <= 0 || height <= 0) return null
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        captureOnGpu(view, width, height)?.let { return it }
      }
      return captureOnCpu(view, width, height)
    }

    // A RenderNode recording only references the live child nodes, so it has to be rasterized to freeze it.
    @RequiresApi(Build.VERSION_CODES.Q)
    private fun captureOnGpu(view: View, width: Int, height: Int): RevealFrame? =
      runCatching {
        val node = RenderNode("ThemeTransitionFrame")
        node.setPosition(0, 0, width, height)
        val canvas = node.beginRecording()
        try {
          drawLive(view, canvas)
        } finally {
          node.endRecording()
        }

        val surface = CaptureSurface(view, width, height)
        val bitmap =
          try {
            surface.render(node)
          } finally {
            node.discardDisplayList()
          }

        if (bitmap == null) {
          surface.close()
          null
        } else {
          RevealFrame(bitmap, surface, width, height)
        }
      }.getOrNull()

    private fun captureOnCpu(view: View, width: Int, height: Int): RevealFrame? =
      runCatching {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        drawLive(view, Canvas(bitmap))
        RevealFrame(bitmap, null, width, height)
      }.getOrNull()

    private fun drawLive(view: View, canvas: Canvas) {
      val save = canvas.save()
      try {
        canvas.translate(view.left.toFloat(), view.top.toFloat())
        view.draw(canvas)
      } finally {
        canvas.restoreToCount(save)
      }
    }
  }
}

internal class CaptureSurface(view: View, private val width: Int, height: Int) {
  private val density = view.resources.displayMetrics.density
  private val reader: ImageReader? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ImageReader.newInstance(
        width,
        height,
        PixelFormat.RGBA_8888,
        1,
        HardwareBuffer.USAGE_GPU_SAMPLED_IMAGE or HardwareBuffer.USAGE_GPU_COLOR_OUTPUT,
      )
    } else {
      null
    }
  private val renderer: HardwareRenderer? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) HardwareRenderer() else null
  private var image: Image? = null

  @RequiresApi(Build.VERSION_CODES.Q)
  fun render(node: RenderNode): Bitmap? {
    val reader = reader ?: return null
    val renderer = renderer ?: return null
    renderer.setSurface(reader.surface)
    renderer.setContentRoot(node)
    renderer.setLightSourceGeometry(width / 2f, -LIGHT_Y_DP * density, LIGHT_Z_DP * density, LIGHT_RADIUS_DP * density)
    renderer.setLightSourceAlpha(AMBIENT_SHADOW_ALPHA, SPOT_SHADOW_ALPHA)
    renderer.createRenderRequest().setWaitForPresent(true).syncAndDraw()
    // Running ripples in the capture attach to this renderer; ticking them would block RenderThread on the reader's only slot.
    renderer.stop()

    val acquired = reader.acquireNextImage() ?: return null
    val buffer = acquired.hardwareBuffer
    if (buffer == null) {
      acquired.close()
      return null
    }
    image = acquired
    return buffer.use { Bitmap.wrapHardwareBuffer(it, ColorSpace.get(ColorSpace.Named.SRGB)) }
  }

  fun close() {
    runCatching {
      image?.close()
      image = null
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) renderer?.destroy()
      reader?.close()
    }
  }
}
