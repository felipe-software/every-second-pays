package expo.modules.notificationmotion.bills

import android.annotation.TargetApi
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import expo.modules.notificationmotion.R
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

internal data class BillColor(val day: Int, val night: Int)

internal class BillColors(json: JSONObject) {
  private fun pair(json: JSONObject, key: String): BillColor {
    val value = json.getJSONArray(key)
    return BillColor(Color.parseColor(value.getString(0)), Color.parseColor(value.getString(1)))
  }

  val canvas = pair(json, "canvas")
  val track = pair(json, "track")
  val ink = pair(json, "ink")
  val muted = pair(json, "muted")
  val accent = pair(json, "accent")
  val deep = pair(json, "deep")
}

internal class BillMark(json: JSONObject) {
  val at = json.getDouble("at").toFloat()
  val label: String? = json.optString("label").takeIf { json.has("label") && !json.isNull("label") && it.isNotEmpty() }
}

internal class BillSpec(json: JSONObject) {
  val amount: String? = json.optString("amount").takeIf { json.has("amount") && !json.isNull("amount") && it.isNotEmpty() }
  val start: String? = json.optString("start").takeIf { json.has("start") && !json.isNull("start") && it.isNotEmpty() }
  val marks = json.getJSONArray("marks").let { items -> List(items.length()) { BillMark(items.getJSONObject(it)) } }
  val from = json.optDouble("from", 0.0).toFloat().coerceIn(0f, 100f)
  val to = json.optDouble("to", 100.0).toFloat().coerceIn(0f, 100f)
  val intensity = json.optDouble("intensity", 0.6).toFloat().coerceIn(0f, 1f)
  val chain = json.optBoolean("chain", false)
  val colors = BillColors(json.getJSONObject("colors"))
  val description: String = json.optString("title") + ". " + json.optString("body")
  val duration = if (chain) MarkedBarTables.CHAIN_DURATION else MarkedBarTables.SHORT_DURATION

  fun lit(mark: BillMark) = mark.at > from && mark.at <= to
  fun reached(mark: BillMark) = mark.at <= to

  fun lightStep(mark: BillMark): Int {
    val goal = ((mark.at - from) / max(to - from, 1f)).coerceIn(0f, 1f)
    var low = 0f
    var high = 1f
    repeat(22) {
      val middle = (low + high) / 2
      if (middle * middle * (3 - 2 * middle) < goal) low = middle else high = middle
    }
    return (low * duration / MarkedBarTables.LIGHT_GRID).roundToInt().coerceIn(0, MarkedBarTables.litMarks.size - 1)
  }
}

internal class SetupSpec(json: JSONObject) {
  val zero: String = json.getString("zero")
  val title: String = json.getString("title")
  val body: String = json.getString("body")
  val colors = BillColors(json.getJSONObject("colors"))
}

@TargetApi(31)
internal class MarkedBarRenderer(private val context: Context) {
  internal class SetupType(val amount: Float, val title: Float, val body: Float?)

  internal class Shape(
    val height: Float,
    val amount: Float,
    val barGap: Float,
    val bar: Float,
    val tick: Float,
    val label: Float,
    val labelGap: Float,
    val blastBill: Float,
    val density: Float,
    val unit: Float,
    val widthInset: Float,
    val setup: SetupType,
  )

  private val packageName = context.packageName
  private val screenDensity = context.resources.displayMetrics.density
  private val screenWidth = context.resources.displayMetrics.widthPixels / screenDensity
  private val boldFace = Typeface.create("sans-serif", Typeface.BOLD)
  private val mediumFace = Typeface.create("sans-serif-medium", Typeface.NORMAL)

  private class Metrics(val size: Float, val line: Float)
  private class PlacedLabel(val mark: BillMark, val text: String, val width: Float, val left: Float)

  private fun amountPaint(size: Float) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    typeface = boldFace
    textSize = size * screenDensity
    fontFeatureSettings = "tnum"
    letterSpacing = -0.02f
  }

  private fun amountMetrics(text: String, base: Float, width: Float): Metrics {
    val measured = amountPaint(base).measureText(text) / screenDensity
    val size = if (measured > width * 0.92f) base * (width * 0.92f / measured) else base
    val metrics = amountPaint(size).fontMetrics
    return Metrics(size, ceil((metrics.descent - metrics.ascent) / screenDensity))
  }

  private fun labelWidth(text: String, shape: Shape): Float {
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      typeface = mediumFace
      textSize = shape.label * screenDensity
      letterSpacing = -0.01f
    }
    return ceil(paint.measureText(text) / screenDensity) + 2f
  }

  fun render(spec: BillSpec, shape: Shape): RemoteViews {
    val views = RemoteViews(packageName, if (spec.chain) R.layout.nmb_root_chain else R.layout.nmb_root_short)
    val stageWidth = screenWidth - shape.widthInset
    val barWidth = stageWidth * BAR_SHARE
    views.setViewLayoutHeight(R.id.nmb_stage, shape.height, DIP)
    background(views, R.id.nmb_stage, spec.colors.canvas)
    views.setContentDescription(R.id.nmb_stage, spec.description)
    if (spec.chain) trigger(views, R.id.nmb_shake)
    blobs(views, spec.colors, shape, stageWidth)
    views.setViewLayoutWidth(R.id.nmb_plane, barWidth, DIP)

    val metrics = spec.amount?.let { amountMetrics(it, shape.amount, stageWidth) }
    val labelHeight = shape.label * LABEL_LINE
    val line = metrics?.line ?: 0f
    val gap = if (metrics != null) shape.barGap else 0f
    val top = ((shape.height - (line + gap + shape.bar + shape.labelGap + labelHeight)) / 2).coerceAtLeast(0f)
    val barTop = top + line + gap
    val centerY = barTop + shape.bar / 2
    val tipX = barWidth * spec.to / 100

    if (spec.chain) spec.marks.filter { it.at < spec.to }.forEach { mark -> miniIndex(mark)?.let { index -> views.addView(R.id.nmb_plane, miniBurst(index, spec, shape, barWidth * mark.at / 100, centerY)) } }
    views.addView(R.id.nmb_plane, burst(spec, shape, stageWidth, tipX, centerY))
    if (metrics != null) {
      val slot = RemoteViews(packageName, R.layout.nmb_amount_slot)
      slot.setViewLayoutMargin(R.id.nmb_amount_slot, RemoteViews.MARGIN_TOP, top, DIP)
      slot.addView(R.id.nmb_amount_slot, amount(spec, metrics))
      views.addView(R.id.nmb_plane, slot)
    }
    views.addView(R.id.nmb_plane, bar(spec, shape, barWidth, barTop))
    labels(views, spec, shape, barWidth, barTop + shape.bar + shape.labelGap, labelHeight)
    if (spec.chain) spec.marks.filter { it.at < spec.to }.forEach { mark -> miniIndex(mark)?.let { index -> views.addView(R.id.nmb_plane, mini(index, spec, shape, stageWidth, barWidth * mark.at / 100, centerY)) } }
    views.addView(R.id.nmb_plane, blast(spec, shape, stageWidth, tipX, centerY))
    return views
  }

  fun renderSetup(spec: SetupSpec, shape: Shape): RemoteViews {
    val views = RemoteViews(packageName, R.layout.nmb_root_setup)
    val stageWidth = screenWidth - shape.widthInset
    val barWidth = stageWidth * BAR_SHARE
    val type = shape.setup
    views.setViewLayoutHeight(R.id.nmb_stage, shape.height, DIP)
    background(views, R.id.nmb_stage, spec.colors.canvas)
    views.setContentDescription(R.id.nmb_stage, "${spec.title}. ${spec.body}")
    trigger(views, R.id.nmb_shake)
    blobs(views, spec.colors, shape, stageWidth)
    views.setViewLayoutWidth(R.id.nmb_plane, barWidth, DIP)

    val metrics = amountMetrics(spec.zero, type.amount, stageWidth)
    val textGap = shape.labelGap + 1f
    val titleLine = type.title * LABEL_LINE
    val bodyLine = (type.body ?: 0f) * LABEL_LINE
    val top = ((shape.height - (metrics.line + shape.barGap + shape.bar + textGap + titleLine + bodyLine)) / 2).coerceAtLeast(0f)
    val barTop = top + metrics.line + shape.barGap
    val centerY = barTop + shape.bar / 2

    views.addView(R.id.nmb_plane, setupBurst(spec, shape, stageWidth, barWidth * MarkedBarTables.setupTips.last(), centerY))
    val slot = RemoteViews(packageName, R.layout.nmb_amount_slot)
    slot.setViewLayoutMargin(R.id.nmb_amount_slot, RemoteViews.MARGIN_TOP, top, DIP)
    slot.addView(R.id.nmb_amount_slot, amountRow(R.layout.nmb_setup_amount, spec.zero, metrics, spec.colors.ink) { index, digit ->
      val text = (MarkedBarTables.SETUP_REEL_LINES - 1 downTo 0).joinToString("\n") { line -> ((digit + line) % 10).toString() }
      reelStrip(MarkedBarTables.setupReels[index], MarkedBarTables.SETUP_REEL_LINES, text, metrics, spec.colors.ink)
    })
    views.addView(R.id.nmb_plane, slot)
    views.addView(R.id.nmb_plane, setupBar(spec, shape, barWidth, barTop))
    views.addView(R.id.nmb_plane, setupText(spec, type, stageWidth, barWidth, barTop + shape.bar + textGap))
    views.addView(R.id.nmb_plane, setupBeacon(spec, shape, centerY))
    MarkedBarTables.setupPuffs.forEachIndexed { index, puff ->
      val box = RemoteViews(packageName, MarkedBarTables.setupPuffBoxes[index])
      val spread = MarkedBarTables.setupSpreads[index]
      pieces(
        box,
        puff,
        spec.colors,
        shape,
        stageWidth * 0.62f * spread,
        max(shape.height * 0.78f, 52f) * spread,
        barWidth * MarkedBarTables.setupTips[index],
        centerY,
        (puff.bills.size * shape.density).roundToInt(),
        (puff.sparks.size * shape.density).roundToInt(),
      )
      views.addView(R.id.nmb_plane, box)
    }
    return views
  }

  private fun setupBar(spec: SetupSpec, shape: Shape, width: Float, top: Float): RemoteViews {
    val views = RemoteViews(packageName, R.layout.nmb_bar)
    size(views, R.id.nmb_bar, width, shape.bar)
    views.setViewLayoutMargin(R.id.nmb_bar, RemoteViews.MARGIN_TOP, top, DIP)
    background(views, R.id.nmb_bar, spec.colors.track)
    val fill = RemoteViews(packageName, R.layout.nmb_setup_fill)
    fill.setViewLayoutWidth(R.id.nmb_fill_box, width, DIP)
    tint(fill, R.id.nmb_fill_face, spec.colors.accent)
    trigger(fill, R.id.nmb_fill_trigger)
    views.addView(R.id.nmb_bar, fill)
    SETUP_TICKS.forEach { at ->
      val tick = RemoteViews(packageName, R.layout.nmb_tick)
      size(tick, R.id.nmb_tick, shape.tick, shape.tick)
      tick.setViewLayoutMargin(R.id.nmb_tick, RemoteViews.MARGIN_LEFT, width * at - shape.tick / 2, DIP)
      tint(tick, R.id.nmb_tick, spec.colors.canvas)
      views.addView(R.id.nmb_bar, tick)
    }
    return views
  }

  private fun setupText(spec: SetupSpec, type: SetupType, stageWidth: Float, barWidth: Float, top: Float): RemoteViews {
    val views = RemoteViews(packageName, R.layout.nmb_setup_text)
    val width = stageWidth * 0.96f
    views.setViewLayoutWidth(R.id.nmb_setup_text, width, DIP)
    views.setViewLayoutMargin(R.id.nmb_setup_text, RemoteViews.MARGIN_LEFT, (barWidth - width) / 2, DIP)
    views.setViewLayoutMargin(R.id.nmb_setup_text, RemoteViews.MARGIN_TOP, top, DIP)
    views.setTextViewText(R.id.nmb_setup_title, spec.title)
    textStyle(views, R.id.nmb_setup_title, fittedSize(spec.title, type.title, width, mediumFace), spec.colors.ink)
    if (type.body == null) {
      views.setViewVisibility(R.id.nmb_setup_body, View.GONE)
    } else {
      views.setTextViewText(R.id.nmb_setup_body, spec.body)
      textStyle(views, R.id.nmb_setup_body, fittedSize(spec.body, type.body, width, Typeface.DEFAULT), spec.colors.muted)
    }
    return views
  }

  private fun fittedSize(text: String, size: Float, width: Float, face: Typeface): Float {
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      typeface = face
      textSize = size * screenDensity
    }
    val measured = paint.measureText(text) / screenDensity
    return if (measured > width) size * width / measured else size
  }

  private fun setupBurst(spec: SetupSpec, shape: Shape, stageWidth: Float, x: Float, y: Float): RemoteViews {
    val views = RemoteViews(packageName, R.layout.nmb_setup_burst)
    val flashSide = max(stageWidth, shape.height) * 0.5f
    val ring = hypot(stageWidth, shape.height) * 0.6f
    val side = max(flashSide, ring)
    fxBox(views, side, side, x, y)
    flash(views, flashSide, spec.colors.accent)
    size(views, R.id.nmb_ring0i, ring, ring)
    tint(views, R.id.nmb_ring0i, spec.colors.accent)
    trigger(views, R.id.nmb_ring0)
    return views
  }

  private fun setupBeacon(spec: SetupSpec, shape: Shape, y: Float): RemoteViews {
    val views = RemoteViews(packageName, R.layout.nmb_setup_beacon)
    val side = max(shape.height * 0.42f, 26f)
    fxBox(views, side, side, shape.bar / 2, y)
    listOf(R.id.nmb_ring0 to R.id.nmb_ring0i, R.id.nmb_ring1 to R.id.nmb_ring1i).forEach { (ring, image) ->
      size(views, image, side, side)
      tint(views, image, spec.colors.accent)
      trigger(views, ring)
    }
    return views
  }

  private fun miniIndex(mark: BillMark): Int? {
    val marks = MarkedBarTables.miniMarks
    val index = marks.indices.minByOrNull { abs(marks[it] - mark.at) } ?: return null
    return index.takeIf { abs(marks[it] - mark.at) < 1f }
  }

  private fun blobs(views: RemoteViews, colors: BillColors, shape: Shape, width: Float) {
    val a = width * 0.7f
    val b = width * 0.62f
    size(views, R.id.nmb_blob_a, a, a)
    size(views, R.id.nmb_blob_b, b, b)
    views.setViewLayoutMargin(R.id.nmb_blob_a, RemoteViews.MARGIN_LEFT, -width * 0.14f, DIP)
    views.setViewLayoutMargin(R.id.nmb_blob_a, RemoteViews.MARGIN_TOP, -shape.height * 0.5f, DIP)
    views.setViewLayoutMargin(R.id.nmb_blob_b, RemoteViews.MARGIN_RIGHT, -width * 0.12f, DIP)
    views.setViewLayoutMargin(R.id.nmb_blob_b, RemoteViews.MARGIN_BOTTOM, -shape.height * 0.62f, DIP)
    tint(views, R.id.nmb_blob_a, colors.accent)
    tint(views, R.id.nmb_blob_b, colors.accent)
    trigger(views, R.id.nmb_pulse_a)
    trigger(views, R.id.nmb_pulse_b)
  }

  private fun amount(spec: BillSpec, metrics: Metrics): RemoteViews {
    val layout = when {
      spec.chain -> MarkedBarTables.chainAmount
      spec.intensity <= 0.5f -> MarkedBarTables.shortAmounts[0]
      spec.intensity <= 0.7f -> MarkedBarTables.shortAmounts[1]
      else -> MarkedBarTables.shortAmounts[2]
    }
    val reels = if (spec.chain) MarkedBarTables.chainReels else MarkedBarTables.shortReels
    return amountRow(layout, spec.amount.orEmpty(), metrics, spec.colors.ink, reels.size) { index, digit ->
      reel(reels[index], index, digit, metrics, spec.colors.ink)
    }
  }

  private fun amountRow(layout: Int, text: String, metrics: Metrics, color: BillColor, maxReels: Int = MarkedBarTables.setupReels.size, reel: (Int, Int) -> RemoteViews): RemoteViews {
    val views = RemoteViews(packageName, layout)
    trigger(views, R.id.nmb_bump)
    val run = StringBuilder()
    var reelIndex = 0
    fun flush() {
      if (run.isEmpty()) return
      val piece = RemoteViews(packageName, R.layout.nmb_run)
      piece.setTextViewText(R.id.nmb_run, run.toString())
      textStyle(piece, R.id.nmb_run, metrics.size, color)
      piece.setViewLayoutHeight(R.id.nmb_run, metrics.line, DIP)
      views.addView(R.id.nmb_amount_row, piece)
      run.clear()
    }
    for (char in text) {
      if (char.isDigit() && reelIndex < maxReels) {
        flush()
        views.addView(R.id.nmb_amount_row, reel(reelIndex, char.digitToInt()))
        reelIndex += 1
      } else {
        run.append(if (char.isWhitespace()) NBSP else char)
      }
    }
    flush()
    return views
  }

  private fun reel(layout: Int, index: Int, digit: Int, metrics: Metrics, color: BillColor): RemoteViews {
    val lines = MarkedBarTables.reelLines[index]
    val text = (0 until lines).joinToString("\n") { line -> ((digit - (lines - 1) + line + 100) % 10).toString() }
    return reelStrip(layout, lines, text, metrics, color)
  }

  private fun reelStrip(layout: Int, lines: Int, text: String, metrics: Metrics, color: BillColor): RemoteViews {
    val views = RemoteViews(packageName, layout)
    views.setViewLayoutHeight(R.id.nmb_reel_box, metrics.line, DIP)
    views.setViewLayoutHeight(R.id.nmb_reel_text, metrics.line * lines, DIP)
    views.setTextViewText(R.id.nmb_reel_text, text)
    textStyle(views, R.id.nmb_reel_text, metrics.size, color)
    trigger(views, R.id.nmb_reel)
    return views
  }

  private fun bar(spec: BillSpec, shape: Shape, width: Float, top: Float): RemoteViews {
    val views = RemoteViews(packageName, R.layout.nmb_bar)
    size(views, R.id.nmb_bar, width, shape.bar)
    views.setViewLayoutMargin(R.id.nmb_bar, RemoteViews.MARGIN_TOP, top, DIP)
    background(views, R.id.nmb_bar, spec.colors.track)
    if (spec.from > 0f) {
      val done = RemoteViews(packageName, R.layout.nmb_bar_done)
      done.setViewLayoutWidth(R.id.nmb_bar_done, width * spec.from / 100, DIP)
      tint(done, R.id.nmb_bar_done, spec.colors.accent)
      views.addView(R.id.nmb_bar, done)
    }
    val fill = RemoteViews(packageName, if (spec.chain) R.layout.nmb_fill_chain else R.layout.nmb_fill_short)
    fill.setViewLayoutWidth(R.id.nmb_fill_box, width * (spec.to - spec.from) / 100, DIP)
    fill.setViewLayoutMargin(R.id.nmb_fill_box, RemoteViews.MARGIN_LEFT, width * spec.from / 100, DIP)
    tint(fill, R.id.nmb_fill_face, spec.colors.accent)
    trigger(fill, R.id.nmb_fill_trigger)
    views.addView(R.id.nmb_bar, fill)
    spec.marks.filter { it.at < 100f }.forEach { mark ->
      val tick = RemoteViews(packageName, R.layout.nmb_tick)
      size(tick, R.id.nmb_tick, shape.tick, shape.tick)
      tick.setViewLayoutMargin(R.id.nmb_tick, RemoteViews.MARGIN_LEFT, width * mark.at / 100 - shape.tick / 2, DIP)
      tint(tick, R.id.nmb_tick, spec.colors.canvas)
      views.addView(R.id.nmb_bar, tick)
    }
    return views
  }

  private fun labels(views: RemoteViews, spec: BillSpec, shape: Shape, width: Float, top: Float, height: Float) {
    spec.start?.let { start ->
      val piece = RemoteViews(packageName, R.layout.nmb_mark_rest)
      place(piece, labelWidth(start, shape), height, 0f, top)
      markText(piece, R.id.nmb_mark_cold, start, shape, spec.colors.muted)
      piece.setFloat(R.id.nmb_mark_cold, "setAlpha", 0.8f)
      views.addView(R.id.nmb_plane, piece)
    }
    placedLabels(spec, shape, width).forEach { label ->
      val lit = spec.lit(label.mark)
      val piece = RemoteViews(packageName, if (lit) MarkedBarTables.litMarks[spec.lightStep(label.mark)] else R.layout.nmb_mark_rest)
      place(piece, label.width, height, label.left, top)
      if (lit) {
        markText(piece, R.id.nmb_mark_cold, label.text, shape, spec.colors.muted)
        markText(piece, R.id.nmb_mark_hot, label.text, shape, spec.colors.deep)
        trigger(piece, R.id.nmb_mark_pop)
        trigger(piece, R.id.nmb_mark_hot_trigger)
      } else {
        markText(piece, R.id.nmb_mark_cold, label.text, shape, if (spec.reached(label.mark)) spec.colors.deep else spec.colors.muted)
      }
      views.addView(R.id.nmb_plane, piece)
    }
  }

  private fun placedLabels(spec: BillSpec, shape: Shape, barWidth: Float): List<PlacedLabel> {
    val gap = shape.label * LABEL_GAP
    val floor = spec.start?.let { labelWidth(it, shape) + gap } ?: 0f
    var limit = barWidth + gap
    val placed = mutableListOf<PlacedLabel>()
    for (mark in spec.marks.sortedByDescending { it.at }) {
      val text = mark.label ?: continue
      val width = labelWidth(text, shape)
      val ideal = idealLabelLeft(mark, width, shape, barWidth)
      val left = min(ideal, limit - gap - width)
      if (mark.at != spec.to && (left < floor || ideal - left > shape.label * MAX_LABEL_DRIFT)) continue
      placed += PlacedLabel(mark, text, width, left.coerceAtLeast(0f))
      limit = left
    }
    return placed
  }

  private fun idealLabelLeft(mark: BillMark, width: Float, shape: Shape, barWidth: Float): Float {
    val x = barWidth * mark.at / 100
    return when {
      mark.at >= 100f -> barWidth - width
      mark.at >= CROWDED_FROM -> x - width - shape.label * LABEL_GAP
      else -> x - width / 2
    }
  }

  private fun place(views: RemoteViews, width: Float, height: Float, left: Float, top: Float) {
    size(views, R.id.nmb_mark, width, height)
    views.setViewLayoutMargin(R.id.nmb_mark, RemoteViews.MARGIN_LEFT, left, DIP)
    views.setViewLayoutMargin(R.id.nmb_mark, RemoteViews.MARGIN_TOP, top, DIP)
  }

  private fun blast(spec: BillSpec, shape: Shape, stageWidth: Float, x: Float, y: Float): RemoteViews {
    val views = RemoteViews(packageName, if (spec.chain) R.layout.nmb_blast_chain else R.layout.nmb_blast_short)
    val base = if (spec.chain) MarkedBarTables.chainBlast else MarkedBarTables.shortBlast
    val k = 0.45f + 0.55f * spec.intensity
    val reach = if (spec.intensity > 0.9f) 1.15f else 1f
    pieces(
      views,
      base,
      spec.colors,
      shape,
      stageWidth * 0.62f * reach,
      max(shape.height * 0.78f, 52f) * reach,
      x,
      y,
      (base.bills.size * k * shape.density).roundToInt(),
      (base.sparks.size * k * shape.density).roundToInt(),
    )
    return views
  }

  private fun mini(index: Int, spec: BillSpec, shape: Shape, stageWidth: Float, x: Float, y: Float): RemoteViews {
    val views = RemoteViews(packageName, MarkedBarTables.miniBoxes[index])
    pieces(
      views,
      MarkedBarTables.mini[index],
      spec.colors,
      shape,
      stageWidth * 0.62f * 0.5f,
      max(shape.height * 0.78f, 52f) * 0.5f,
      x,
      y,
      (3 * shape.density).roundToInt(),
      (4 * shape.density).roundToInt(),
    )
    return views
  }

  private fun pieces(
    views: RemoteViews,
    burst: MarkedBurst,
    colors: BillColors,
    shape: Shape,
    boxWidth: Float,
    boxHeight: Float,
    x: Float,
    y: Float,
    billCount: Int,
    sparkCount: Int,
  ) {
    fxBox(views, boxWidth, boxHeight, x, y)
    burst.bills.forEachIndexed { index, piece ->
      if (index >= billCount) {
        views.setViewVisibility(piece.trigger, View.GONE)
      } else {
        val side = shape.blastBill * piece.width
        size(views, piece.image, side, side)
        trigger(views, piece.trigger)
      }
    }
    val tones = listOf(colors.accent, colors.deep, GOLD, WHITE)
    burst.sparks.forEachIndexed { index, piece ->
      if (index >= sparkCount) {
        views.setViewVisibility(piece.trigger, View.GONE)
      } else {
        size(views, piece.image, piece.width * shape.unit, piece.height * shape.unit)
        tint(views, piece.image, tones[piece.tone])
        trigger(views, piece.trigger)
      }
    }
  }

  private fun miniBurst(index: Int, spec: BillSpec, shape: Shape, x: Float, y: Float): RemoteViews {
    val views = RemoteViews(packageName, MarkedBarTables.miniBursts[index])
    val flashSide = max(50f, shape.height * 0.55f)
    val ring = shape.height * 0.8f
    val side = max(flashSide, ring)
    fxBox(views, side, side, x, y)
    flash(views, flashSide, spec.colors.accent)
    size(views, R.id.nmb_ring0i, ring, ring)
    tint(views, R.id.nmb_ring0i, spec.colors.accent)
    trigger(views, R.id.nmb_ring0)
    return views
  }

  private fun burst(spec: BillSpec, shape: Shape, stageWidth: Float, x: Float, y: Float): RemoteViews {
    val views = RemoteViews(packageName, if (spec.chain) R.layout.nmb_burst_chain else R.layout.nmb_burst_short)
    val p = spec.intensity
    val flashSide = max(stageWidth, shape.height) * 0.68f * (0.6f + 0.4f * p)
    val ring = hypot(stageWidth, shape.height) * 0.9f * (0.55f + 0.45f * p)
    val outer = ring * 1.25f
    val side = max(flashSide, outer)
    fxBox(views, side, side, x, y)
    flash(views, flashSide, spec.colors.accent)
    size(views, R.id.nmb_ring0i, ring, ring)
    tint(views, R.id.nmb_ring0i, spec.colors.accent)
    trigger(views, R.id.nmb_ring0)
    if (p > 0.8f) {
      size(views, R.id.nmb_ring1i, outer, outer)
      tint(views, R.id.nmb_ring1i, spec.colors.accent)
      trigger(views, R.id.nmb_ring1)
    } else {
      views.setViewVisibility(R.id.nmb_ring1, View.GONE)
    }
    return views
  }

  private fun flash(views: RemoteViews, side: Float, accent: BillColor) {
    size(views, R.id.nmb_flash_face, side, side)
    size(views, R.id.nmb_flash_core, side * 0.42f, side * 0.42f)
    tint(views, R.id.nmb_flash_glow, accent)
    tint(views, R.id.nmb_flash_core, WHITE)
    trigger(views, R.id.nmb_flash)
  }

  private fun fxBox(views: RemoteViews, width: Float, height: Float, x: Float, y: Float) {
    size(views, R.id.nmb_fx_box, width, height)
    views.setViewLayoutMargin(R.id.nmb_fx_box, RemoteViews.MARGIN_LEFT, x - width / 2, DIP)
    views.setViewLayoutMargin(R.id.nmb_fx_box, RemoteViews.MARGIN_TOP, y - height / 2, DIP)
  }

  private fun markText(views: RemoteViews, id: Int, text: String, shape: Shape, color: BillColor) {
    views.setTextViewText(id, text)
    views.setTextViewTextSize(id, DIP, shape.label)
    views.setColorInt(id, "setTextColor", color.day, color.night)
  }

  private fun textStyle(views: RemoteViews, id: Int, size: Float, color: BillColor) {
    views.setTextViewTextSize(id, DIP, size)
    views.setColorInt(id, "setTextColor", color.day, color.night)
  }

  private fun size(views: RemoteViews, id: Int, width: Float, height: Float) {
    views.setViewLayoutWidth(id, width, DIP)
    views.setViewLayoutHeight(id, height, DIP)
  }

  private fun tint(views: RemoteViews, id: Int, color: BillColor) {
    views.setColorInt(id, "setColorFilter", color.day, color.night)
  }

  private fun background(views: RemoteViews, id: Int, color: BillColor) {
    views.setColorStateList(id, "setBackgroundTintList", ColorStateList.valueOf(color.day), ColorStateList.valueOf(color.night))
  }

  private fun trigger(views: RemoteViews, id: Int) {
    views.setDisplayedChild(id, 1)
  }

  companion object {
    private const val DIP = TypedValue.COMPLEX_UNIT_DIP
    private const val NBSP = ' '
    private const val BAR_SHARE = 0.88f
    private const val LABEL_LINE = 1.25f
    private const val CROWDED_FROM = 88f
    private const val LABEL_GAP = 0.45f
    private const val MAX_LABEL_DRIFT = 1.5f
    private val GOLD = BillColor(0xFFF5C451.toInt(), 0xFFF5C451.toInt())
    private val WHITE = BillColor(Color.WHITE, Color.WHITE)
    private val SETUP_TICKS = listOf(0.25f, 0.5f, 0.75f)

    val EXPANDED = Shape(176f, 46f, 8f, 9f, 4f, 11.5f, 5f, 40f, 1f, 1f, 120f, SetupType(46f, 16f, 13f))
    val POPUP = Shape(76f, 32f, 3f, 5f, 3f, 9.5f, 2f, 26f, 0.7f, 0.72f, 155f, SetupType(26f, 12f, 10.5f))
    val COLLAPSED = Shape(47f, 23f, 2f, 4f, 2f, 8.5f, 1f, 20f, 0.6f, 0.56f, 155f, SetupType(20f, 10.5f, null))
  }
}
