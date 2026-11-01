package expo.modules.notificationmotion.bills

import android.annotation.TargetApi
import android.content.Context
import android.graphics.Paint
import android.graphics.Typeface
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.RemoteViews
import expo.modules.notificationmotion.R
import org.json.JSONObject
import kotlin.math.ceil
import kotlin.math.max

internal class TumbleweedSpec(json: JSONObject) {
  val title: String = json.getString("title")
  val body: String = json.getString("body")
  val zero: String = json.getString("zero")
}

@TargetApi(31)
internal class TumbleweedRenderer(private val context: Context) {
  internal class Surface(
    val height: Float,
    val widthInset: Float,
    val weed: Float,
    val ground: Float,
    val mesa: Float,
    val cactus: Float,
    val sign: Float,
    val sun: Float,
    val title: Float,
    val body: Float,
    val foot: Float,
    val rollFoot: Float,
    val textEdge: Float,
    val centered: Boolean,
  )

  private val density = context.resources.displayMetrics.density
  private val screenWidth = context.resources.displayMetrics.widthPixels / density
  private val mediumFace = Typeface.create("sans-serif-medium", Typeface.NORMAL)
  private val regularFace = Typeface.create("sans-serif", Typeface.NORMAL)
  private val boldFace = Typeface.create("sans-serif", Typeface.BOLD)

  fun render(spec: TumbleweedSpec, surface: Surface): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.ntw_root)
    val width = screenWidth - surface.widthInset
    views.setViewLayoutHeight(R.id.ntw_stage, surface.height, DIP)
    views.setContentDescription(R.id.ntw_stage, "${spec.title}. ${spec.body}")
    landscape(views, surface, width)
    sign(views, spec, surface, width)
    wind(views, surface, width)
    weed(views, surface, width)
    text(views, spec, surface, width)
    return views
  }

  private fun landscape(views: RemoteViews, surface: Surface, width: Float) {
    views.setViewLayoutHeight(R.id.ntw_ground, surface.ground, DIP)
    views.setViewLayoutHeight(R.id.ntw_mesa, surface.mesa, DIP)
    views.setViewLayoutMargin(R.id.ntw_mesa, RemoteViews.MARGIN_BOTTOM, surface.ground - 1f, DIP)
    size(views, R.id.ntw_sun, surface.sun, surface.sun)
    views.setViewLayoutMargin(R.id.ntw_sun, RemoteViews.MARGIN_RIGHT, width * 0.2f, DIP)
    views.setViewLayoutMargin(R.id.ntw_sun, RemoteViews.MARGIN_BOTTOM, surface.ground - surface.sun * 0.3f, DIP)
    size(views, R.id.ntw_cactus, surface.cactus * 0.6f, surface.cactus)
    views.setViewLayoutMargin(R.id.ntw_cactus, RemoteViews.MARGIN_RIGHT, width * ART_INSET, DIP)
    views.setViewLayoutMargin(R.id.ntw_cactus, RemoteViews.MARGIN_BOTTOM, surface.ground * surface.foot, DIP)
  }

  private fun sign(views: RemoteViews, spec: TumbleweedSpec, surface: Surface, width: Float) {
    if (surface.sign <= 0f) {
      views.setViewVisibility(R.id.ntw_sign, View.GONE)
      return
    }
    val textSize = fitted(spec.zero, surface.sign * 0.46f, surface.sign - 2f, boldFace, 1f)
    val boardHeight = surface.sign * 0.6f
    val postHeight = surface.sign * 0.42f
    size(views, R.id.ntw_sign, surface.sign, boardHeight + postHeight)
    views.setViewLayoutMargin(R.id.ntw_sign, RemoteViews.MARGIN_RIGHT, width * ART_INSET + surface.cactus * 0.72f, DIP)
    views.setViewLayoutMargin(R.id.ntw_sign, RemoteViews.MARGIN_BOTTOM, surface.ground * surface.foot, DIP)
    views.setTextViewText(R.id.ntw_board, spec.zero)
    views.setTextViewTextSize(R.id.ntw_board, DIP, textSize)
    views.setViewLayoutHeight(R.id.ntw_board, boardHeight, DIP)
    size(views, R.id.ntw_post, surface.sign * 0.12f, postHeight)
    views.setDisplayedChild(R.id.ntw_sign_t, 1)
  }

  private fun wind(views: RemoteViews, surface: Surface, width: Float) {
    val lifts = listOf(0.9f, 0.3f)
    TumbleweedTables.winds.forEachIndexed { index, wind ->
      size(views, wind.image, width * 0.26f, WIND_THICKNESS)
      views.setViewLayoutMargin(wind.image, RemoteViews.MARGIN_RIGHT, width * WIND_RIGHT[index], DIP)
      views.setViewLayoutMargin(wind.image, RemoteViews.MARGIN_BOTTOM, surface.ground + surface.mesa * lifts[index], DIP)
      views.setDisplayedChild(wind.trigger, 1)
    }
  }

  private fun weed(views: RemoteViews, surface: Surface, width: Float) {
    val rollBottom = surface.ground * surface.rollFoot
    size(views, R.id.ntw_weed_box, surface.weed, surface.weed)
    views.setViewLayoutMargin(R.id.ntw_weed_box, RemoteViews.MARGIN_RIGHT, -surface.weed * START_OUTSIDE, DIP)
    views.setViewLayoutMargin(R.id.ntw_weed_box, RemoteViews.MARGIN_BOTTOM, rollBottom, DIP)
    listOf(R.id.ntw_go, R.id.ntw_up, R.id.ntw_spin).forEach { views.setDisplayedChild(it, 1) }
    val dust = surface.weed * 0.34f
    TumbleweedTables.dusts.forEach { puff ->
      val rolled = width * TumbleweedTables.TRAVEL * (puff.at - TumbleweedTables.ROLL_START) / TumbleweedTables.ROLL_MS
      val center = rolled - surface.weed * (START_OUTSIDE - 0.5f)
      size(views, puff.image, dust, dust)
      views.setViewLayoutMargin(puff.image, RemoteViews.MARGIN_RIGHT, center - dust / 2, DIP)
      views.setViewLayoutMargin(puff.image, RemoteViews.MARGIN_BOTTOM, rollBottom, DIP)
      views.setDisplayedChild(puff.trigger, 1)
    }
  }

  private fun text(views: RemoteViews, spec: TumbleweedSpec, surface: Surface, width: Float) {
    val textWidth = width - TEXT_SIDE * 2
    val title = fitted(spec.title, surface.title, textWidth, mediumFace, TITLE_FLOOR)
    val body = fitted(spec.body, surface.body, textWidth, regularFace, BODY_FLOOR)
    val block = title * LINE + body * LINE
    val top = if (surface.centered) surface.height - surface.textEdge - block else surface.textEdge
    views.setViewLayoutWidth(R.id.ntw_text, textWidth, DIP)
    views.setViewLayoutMargin(R.id.ntw_text, RemoteViews.MARGIN_LEFT, TEXT_SIDE, DIP)
    views.setViewLayoutMargin(R.id.ntw_text, RemoteViews.MARGIN_TOP, top, DIP)
    line(views, R.id.ntw_title, spec.title, title, surface.centered)
    line(views, R.id.ntw_body, spec.body, body, surface.centered)
  }

  private fun line(views: RemoteViews, id: Int, text: String, size: Float, centered: Boolean) {
    views.setTextViewText(id, text)
    views.setTextViewTextSize(id, DIP, size)
    views.setInt(id, "setGravity", if (centered) Gravity.CENTER_HORIZONTAL else Gravity.START)
  }

  private fun fitted(text: String, size: Float, width: Float, face: Typeface, floor: Float): Float {
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      typeface = face
      textSize = size * density
    }
    val measured = ceil(paint.measureText(text) / density)
    return if (measured > width) max(size * width / measured, floor) else size
  }

  private fun size(views: RemoteViews, id: Int, width: Float, height: Float) {
    views.setViewLayoutWidth(id, width, DIP)
    views.setViewLayoutHeight(id, height, DIP)
  }

  companion object {
    private const val DIP = TypedValue.COMPLEX_UNIT_DIP
    private const val ART_INSET = 0.08f
    private const val START_OUTSIDE = 1.6f
    private const val WIND_THICKNESS = 1.5f
    private const val LINE = 1.25f
    private const val TEXT_SIDE = 10f
    private const val TITLE_FLOOR = 10.5f
    private const val BODY_FLOOR = 8.5f
    private val WIND_RIGHT = listOf(0.1f, 0.34f)

    val EXPANDED = Surface(176f, 120f, 40f, 66f, 30f, 58f, 46f, 58f, 18f, 13.5f, 0.84f, 0.82f, 11f, true)
    val POPUP = Surface(76f, 155f, 19f, 13f, 16f, 29f, 24f, 26f, 13f, 10.5f, 0.5f, 0.38f, 7f, false)
    val COLLAPSED = Surface(47f, 155f, 12f, 7f, 9f, 17f, 0f, 14f, 11.5f, 9.5f, 0.5f, 0.38f, 4f, false)
  }
}
