package expo.modules.jellytabs

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Build
import android.text.Layout
import android.text.SpannableString
import android.text.Spanned
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import android.text.style.MetricAffectingSpan
import android.view.View
import android.widget.TextView
import androidx.core.graphics.PathParser
import com.facebook.react.common.ReactConstants
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.views.text.ReactTypefaceUtils
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

private const val ICON_VIEWPORT = 24f
private const val ICON_SIZE_DP = 23f
private const val ICON_OFFSET_DP = 2f
private const val LABEL_TEXT_SIZE_SP = 13f
private const val LABEL_PADDING_DP = 4f
private const val ACTIVE_FONT_WEIGHT = 700
private const val INACTIVE_FONT_WEIGHT = 400
private const val ROUNDING_TOLERANCE = 0.0001f

internal fun rasterizeTabIcon(pathData: String, width: Int, height: Int): Bitmap {
  val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ALPHA_8)
  val size = min(width, height)
  val canvas = Canvas(bitmap)
  canvas.translate((width - size) / 2f, (height - size) / 2f)
  canvas.scale(size / ICON_VIEWPORT, size / ICON_VIEWPORT)
  canvas.drawPath(PathParser.createPathFromPathData(pathData), Paint(Paint.ANTI_ALIAS_FLAG))
  return bitmap
}

// Yoga sizes a box by rounding both of its absolute edges, so the same width can land on different pixels per tab.
internal fun roundedSpan(start: Float, length: Float) = (start + length).roundToInt() - start.roundToInt()

// Yoga rounds a text box outward, so a label can be a pixel wider than the tab holding it.
private fun textBoxSpan(start: Float, length: Float): Int {
  val end = start + length
  val isWholeLength = abs(length - length.roundToInt()) < ROUNDING_TOLERANCE
  val roundedEnd = if (isWholeLength) floor(end + ROUNDING_TOLERANCE) else ceil(end - ROUNDING_TOLERANCE)
  return roundedEnd.toInt() - floor(start + ROUNDING_TOLERANCE).toInt()
}

// Text scaled per frame re-rasterizes its glyphs, so a face draws from bitmaps baked once: one for rest, one for the pressed scale.
internal class JellyTabFaceView(
  context: Context,
  isActive: Boolean,
  private val pressedRasterScale: Float,
) : View(context) {
  private val density = resources.displayMetrics.density
  private val maskPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
  private val labelPaint = TextPaint(TextPaint.ANTI_ALIAS_FLAG)
  private val iconBakePaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
  // A themed TextView's default face isn't Typeface.DEFAULT, and React Native's text starts from the former.
  private val labelStyle = LabelStyleSpan(
    size = ceil(PixelUtil.toPixelFromSP(LABEL_TEXT_SIZE_SP)),
    face = ReactTypefaceUtils.applyStyles(
      TextView(context).typeface,
      ReactConstants.UNSET,
      if (isActive) ACTIVE_FONT_WEIGHT else INACTIVE_FONT_WEIGHT,
      null,
      context.assets,
    ),
  )
  private val pressedBounds = RectF()
  private var iconPath = ""
  private var iconVector: Path? = null
  private var icon: Bitmap? = null
  private var iconLeft = 0f
  private var iconTop = 0f
  private var iconSize = 0f
  private var label = ""
  private var labelLayout: Layout? = null
  private var labelLeft = 0f
  private var labelTop = 0f
  private var restMask: Bitmap? = null
  private var pressedMask: Bitmap? = null
  private var isPressedRaster = false

  init {
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  fun setContent(nextLabel: String, nextIconPath: String) {
    label = nextLabel
    iconPath = nextIconPath
    iconVector = PathParser.createPathFromPathData(nextIconPath)
  }

  fun setContentColor(color: Int) {
    maskPaint.color = color
    if (labelPaint.color != color) {
      labelPaint.color = color
      bakeMasks()
    }
    invalidate()
  }

  fun setPressedRaster(isPressed: Boolean) {
    if (isPressedRaster == isPressed) return
    isPressedRaster = isPressed
    invalidate()
  }

  // Mirrors the Yoga column it replaces: an icon over a label, centered in the unrounded tab box.
  fun place(
    left: Int,
    top: Int,
    box: TabBox,
    iconFor: (path: String, width: Int, height: Int) -> Bitmap,
  ) {
    val width = roundedSpan(box.absoluteLeft, box.width)
    val height = roundedSpan(box.absoluteTop, box.height)
    layout(left, top, left + width, top + height)

    val padding = floor(LABEL_PADDING_DP * density).toInt()
    val textLayout = buildLabelLayout(textBoxSpan(box.absoluteLeft, box.width) - padding * 2)
    labelLayout = textLayout
    labelLeft = padding.toFloat()

    iconSize = ICON_SIZE_DP * density
    val iconInsetX = (box.width - iconSize) / 2f
    val iconInsetY = (box.height - iconSize - textLayout.height) / 2f
    icon = iconFor(
      iconPath,
      roundedSpan(box.absoluteLeft + iconInsetX, iconSize),
      roundedSpan(box.absoluteTop + iconInsetY, iconSize),
    )
    iconLeft = iconInsetX.roundToInt().toFloat()
    iconTop = iconInsetY.roundToInt() + ICON_OFFSET_DP * density
    labelTop = floor(iconInsetY + iconSize)
    bakeMasks()
    invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    val pressed = pressedMask
    if (isPressedRaster && pressed != null) {
      canvas.drawBitmap(pressed, null, pressedBounds, maskPaint)
    } else {
      restMask?.let { canvas.drawBitmap(it, 0f, 0f, maskPaint) }
    }
  }

  override fun hasOverlappingRendering() = false

  private fun bakeMasks() {
    val textLayout = labelLayout ?: return
    if (width == 0 || height == 0) return
    val maskHeight = max(height, ceil(labelTop + textLayout.height).toInt())

    restMask = Bitmap.createBitmap(width, maskHeight, Bitmap.Config.ALPHA_8).also { mask ->
      val canvas = Canvas(mask)
      icon?.let { canvas.drawBitmap(it, iconLeft, iconTop, iconBakePaint) }
      drawLabel(canvas, textLayout)
    }

    val pressedWidth = ceil(width * pressedRasterScale).toInt()
    val pressedHeight = ceil(maskHeight * pressedRasterScale).toInt()
    pressedBounds.set(0f, 0f, pressedWidth / pressedRasterScale, pressedHeight / pressedRasterScale)
    pressedMask = Bitmap.createBitmap(pressedWidth, pressedHeight, Bitmap.Config.ALPHA_8).also { mask ->
      val canvas = Canvas(mask)
      canvas.scale(pressedRasterScale, pressedRasterScale)
      iconVector?.let { path ->
        val restoreCount = canvas.save()
        canvas.translate(iconLeft, iconTop)
        canvas.scale(iconSize / ICON_VIEWPORT, iconSize / ICON_VIEWPORT)
        canvas.drawPath(path, iconBakePaint)
        canvas.restoreToCount(restoreCount)
      }
      drawLabel(canvas, textLayout)
    }
  }

  private fun drawLabel(canvas: Canvas, textLayout: Layout) {
    val restoreCount = canvas.save()
    canvas.translate(labelLeft, labelTop)
    textLayout.draw(canvas)
    canvas.restoreToCount(restoreCount)
  }

  private fun buildLabelLayout(width: Int): Layout {
    val text = SpannableString(label)
    text.setSpan(labelStyle, 0, label.length, Spanned.SPAN_INCLUSIVE_INCLUSIVE)
    val builder = StaticLayout.Builder.obtain(text, 0, text.length, labelPaint, width.coerceAtLeast(0))
      .setAlignment(Layout.Alignment.ALIGN_CENTER)
      .setLineSpacing(0f, 1f)
      .setIncludePad(true)
      .setEllipsize(TextUtils.TruncateAt.END)
      .setMaxLines(1)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      builder.setUseLineSpacingFromFallbacks(true)
    }
    return builder.build()
  }
}

// Keep in sync with React Native's CustomStyleSpan: linear text changes the glyph advances.
private class LabelStyleSpan(private val size: Float, private val face: Typeface) : MetricAffectingSpan() {
  override fun updateDrawState(paint: TextPaint) = apply(paint)

  override fun updateMeasureState(paint: TextPaint) = apply(paint)

  private fun apply(paint: TextPaint) {
    paint.textSize = size
    paint.typeface = face
    paint.isSubpixelText = true
    paint.isLinearText = true
  }
}

internal class TabBox(
  val absoluteLeft: Float,
  val absoluteTop: Float,
  val width: Float,
  val height: Float,
)
