package expo.modules.notificationmotion.money

import android.annotation.TargetApi
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.os.Parcel
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.RemoteViews
import expo.modules.notificationmotion.R
import java.util.Locale
import kotlin.math.max
import kotlin.math.roundToInt

@TargetApi(31)
internal class MoneyWidgetRenderer(private val context: Context) {
  data class Size(val width: Float, val height: Float)

  class Result(
    val views: RemoteViews,
    val full: Boolean,
    val signature: String,
    val timeline: MoneyTimeline,
    val ambientSnapshots: String?,
  )

  private class Landing(val index: Int, val spot: MoneyAmbient.Spot)

  // Frame content is placed relative to the widget's center (or left edge, for the ledger), never
  // to its exact size, which the launcher only reports approximately.
  private class Geometry(
    val halfWidth: Float,
    val halfHeight: Float,
    val paddingX: Float,
    val paddingY: Float,
    val header: Boolean,
    val caption: Boolean,
    val bandWidth: Float,
    val bandHeight: Float,
    val offsetY: Float,
  )

  private val packageName = context.packageName
  private val typography = MoneyTypography(context)
  private val density = context.resources.displayMetrics.density

  fun render(
    config: MoneyConfig,
    data: MoneyData,
    size: Size,
    now: Long,
    previousCents: Long?,
    click: PendingIntent?,
    clickTemplate: PendingIntent?,
    previousSignature: String?,
    ambientSnapshots: String? = null,
    maxFrames: Int = MAX_FRAMES,
  ): Result {
    val geometry = geometry(config, size)
    val signature = listOf(config.toJson(), data.lookSignature, size.width.toInt(), size.height.toInt(), data.period(config)).joinToString("#")
    val full = signature != previousSignature
    var frames = maxFrames
    while (true) {
      val timeline = MoneyTimeline.build(data.schedule(data.period(config)), now, frames)
      val snapshots = org.json.JSONArray()
      val views = RemoteViews(packageName, R.layout.nmw_widget)
      if (full) fullViews(views, config, data, geometry, click, clickTemplate)
      applyDynamic(views, config, data, geometry, timeline, previousCents, ambientSnapshots, snapshots)
      // Keep the update well under the binder limit; fewer frames just means an earlier re-sync.
      if (frames <= MIN_FRAMES || parcelSize(views) <= MAX_BYTES) {
        return Result(views, full, signature, timeline, snapshots.takeIf { it.length() > 0 }?.toString())
      }
      frames /= 2
    }
  }

  private fun parcelSize(views: RemoteViews): Int {
    val parcel = Parcel.obtain()
    return try {
      views.writeToParcel(parcel, 0)
      parcel.dataSize()
    } finally {
      parcel.recycle()
    }
  }

  private fun geometry(config: MoneyConfig, size: Size): Geometry {
    val minimal = config.template == "minimal"
    val header = !minimal && size.height >= 96
    val caption = !minimal && config.caption && size.height >= 116
    val paddingX = if (size.width < 160) 12f else 18f
    val paddingY = if (size.height < 100) 8f else 14f
    val headerHeight = if (header) LABEL_HEIGHT else 0f
    val captionHeight = if (caption) LABEL_HEIGHT else 0f
    return Geometry(
      halfWidth = size.width / 2,
      halfHeight = size.height / 2,
      paddingX = paddingX,
      paddingY = paddingY,
      header = header,
      caption = caption,
      bandWidth = size.width - paddingX * 2,
      bandHeight = (size.height - paddingY * 2 - headerHeight - captionHeight).coerceAtLeast(28f),
      offsetY = (headerHeight - captionHeight) / 2,
    )
  }

  // Only sent on full updates: re-syncs are partial so they merge into the cached views and the
  // glow's infinite animations keep running.
  private fun fullViews(
    views: RemoteViews,
    config: MoneyConfig,
    data: MoneyData,
    geometry: Geometry,
    click: PendingIntent?,
    clickTemplate: PendingIntent?,
  ) {
    val colors = data.colors(config)
    val background = if (config.background == "glass") colors.canvas.withAlpha(0.74f) else colors.canvas
    views.setColorStateList(
      android.R.id.background,
      "setBackgroundTintList",
      ColorStateList.valueOf(background.day),
      ColorStateList.valueOf(background.night),
    )
    click?.let { views.setOnClickPendingIntent(android.R.id.background, it) }
    clickTemplate?.let { views.setPendingIntentTemplate(R.id.nmw_ticker, it) }

    val start = config.template == "ledger"
    views.setInt(R.id.nmw_content, "setGravity", if (start) Gravity.START else Gravity.CENTER_HORIZONTAL)
    views.setViewPadding(R.id.nmw_content, px(geometry.paddingX), px(geometry.paddingY), px(geometry.paddingX), px(geometry.paddingY))
    views.removeAllViews(R.id.nmw_live_host)
    views.addView(R.id.nmw_live_host, liveDot(colors))
    views.setColorInt(R.id.nmw_period, "setTextColor", colors.accentDeep.day, colors.accentDeep.night)
    views.setColorInt(R.id.nmw_caption, "setTextColor", colors.muted.day, colors.muted.night)
  }

  private fun applyDynamic(
    views: RemoteViews,
    config: MoneyConfig,
    data: MoneyData,
    geometry: Geometry,
    timeline: MoneyTimeline,
    previousCents: Long?,
    ambientSnapshots: String?,
    snapshots: org.json.JSONArray,
  ) {
    val colors = data.colors(config)
    val period = data.period(config)
    val periodLabel = data.label(period, period).uppercase(Locale.getDefault())
    views.setViewVisibility(R.id.nmw_header, if (geometry.header) View.VISIBLE else View.GONE)
    views.setTextViewText(R.id.nmw_period, periodLabel)
    views.setViewVisibility(R.id.nmw_live_host, if (timeline.ratePerHour > 0) View.VISIBLE else View.GONE)
    views.setViewVisibility(R.id.nmw_caption, if (geometry.caption) View.VISIBLE else View.GONE)
    views.setTextViewText(R.id.nmw_caption, caption(data, timeline))
    val current = CounterText.format(timeline.cents.first(), data.format, config.cents)
    views.setContentDescription(android.R.id.background, "$periodLabel ${current.plain}")

    val texts = timeline.cents.map { CounterText.format(it, data.format, config.cents) }
    val reference = typography.metrics(REFERENCE_SIZE)
    val widest = texts.maxBy { reference.width(it) }
    val maxSize = if (config.template == "ledger") 64f else 76f
    val metrics = typography.fit(widest, geometry.bandWidth * 0.94f, geometry.bandHeight * 0.86f, maxSize)
    val ambient = if (config.effect != "none" && timeline.ratePerHour > 0) {
      val all = MoneyEffects.slots[config.effect].orEmpty().size
      val count = when (config.intensity) {
        "calm" -> (all * 0.4f).roundToInt()
        "lively" -> (all * 0.7f).roundToInt()
        else -> all
      }
      MoneyAmbient(config.effect, (metrics.bigSize * 0.5f).coerceIn(22f, 38f), geometry.halfWidth, geometry.halfHeight, count)
    } else {
      null
    }
    ambient?.let { catchUp(it, ambientSnapshots, config, data, timeline) }
    val items = RemoteViews.RemoteCollectionItems.Builder().setHasStableIds(false).setViewTypeCount(2)
    texts.forEachIndexed { index, text ->
      val beforeCents = if (index == 0) previousCents else timeline.cents[index - 1]
      val before = if (index == 0) previousCents?.let { CounterText.format(it, data.format, config.cents) } else texts[index - 1]
      val rising = beforeCents == null || timeline.cents[index] >= beforeCents
      val time = timeline.startAt + index * timeline.tick
      if (ambient != null && index % SNAPSHOT_EVERY == 0) {
        snapshots.put(org.json.JSONObject().put("time", time).put("state", ambient.snapshot()))
      }
      val landings = ambient?.let { land(config, it, time, before, text, rising) }.orEmpty()
      items.addItem(index.toLong(), frame(config, colors, geometry, metrics, ambient, landings, time, before, text, rising))
    }
    views.setRemoteAdapter(R.id.nmw_ticker, items.build())
    views.setDisplayedChild(R.id.nmw_ticker, 0)
  }

  private fun catchUp(ambient: MoneyAmbient, saved: String?, config: MoneyConfig, data: MoneyData, timeline: MoneyTimeline) {
    val snapshots = saved?.let { runCatching { org.json.JSONArray(it) }.getOrNull() } ?: return
    val latest = (0 until snapshots.length())
      .map { snapshots.getJSONObject(it) }
      .filter { it.getLong("time") <= timeline.startAt && timeline.startAt - it.getLong("time") <= MAX_REPLAY }
      .maxByOrNull { it.getLong("time") }
      ?: return
    if (!ambient.restore(latest.getJSONObject("state"))) return
    val schedule = data.schedule(data.period(config))
    val counter = { time: Long -> CounterText.cents(schedule.valueAt(time)) }
    var time = latest.getLong("time")
    while (time < timeline.startAt) {
      val before = counter(time - timeline.tick)
      val now = counter(time)
      land(
        config,
        ambient,
        time,
        CounterText.format(before, data.format, config.cents),
        CounterText.format(now, data.format, config.cents),
        now >= before,
      )
      time += timeline.tick
    }
  }

  private fun land(config: MoneyConfig, ambient: MoneyAmbient, time: Long, before: CounterText?, text: CounterText, rising: Boolean): List<Landing> {
    val slots = segments(before, text).filterIsInstance<Segment.Slot>()
    val wanted = when {
      !rising || slots.isEmpty() -> 0
      slots.any { it.wholeDigit } -> when (config.intensity) { "calm" -> 1; "lively" -> 2; else -> 3 }
      else -> when (config.intensity) { "calm" -> 0; "lively" -> 1; else -> 2 }
    }
    val seconds = time / 1000.0
    return pick(ambient, seconds, wanted, time).map { index ->
      Landing(index, ambient.spot(index, seconds)).also { ambient.collect(index, seconds) }
    }
  }

  private fun caption(data: MoneyData, timeline: MoneyTimeline): String = when {
    !data.hasSources -> data.label("empty", "Add a payment source")
    timeline.ratePerHour > 0 -> data.label("rate", "{{amount}} an hour").replace("{{amount}}", amount(data.format, timeline.ratePerHour))
    else -> data.label("idle", "Not earning right now")
  }

  private fun amount(format: MoneyFormat, dollars: Double): String {
    val cents = CounterText.cents(dollars * 100)
    return CounterText.format(cents, format, true).plain.replace(" ", "")
  }

  private fun frame(
    config: MoneyConfig,
    colors: MoneyColors,
    geometry: Geometry,
    metrics: CounterMetrics,
    ambient: MoneyAmbient?,
    landings: List<Landing>,
    time: Long,
    before: CounterText?,
    text: CounterText,
    rising: Boolean,
  ): RemoteViews {
    val start = config.template == "ledger"
    val pieces = segments(before, text)
    val slots = pieces.filterIsInstance<Segment.Slot>()
    val wholeChanged = slots.any { it.wholeDigit }
    val seconds = time / 1000.0
    val bills = landings.size
    val views = RemoteViews(
      packageName,
      when {
        start && wholeChanged -> R.layout.nmw_frame_start_whole
        start -> R.layout.nmw_frame_start_cents
        wholeChanged -> R.layout.nmw_frame_center_whole
        else -> R.layout.nmw_frame_center_cents
      },
    )
    views.setOnClickFillInIntent(R.id.nmw_frame, Intent())
    views.setViewLayoutMargin(R.id.nmw_bump, RemoteViews.MARGIN_TOP, geometry.offsetY, TypedValue.COMPLEX_UNIT_DIP)
    if (start) views.setViewLayoutMargin(R.id.nmw_bump, RemoteViews.MARGIN_LEFT, geometry.paddingX, TypedValue.COMPLEX_UNIT_DIP)

    var x = 0f
    var changeStart: Float? = null
    var changeEnd = 0f
    var changeWhole = false
    for (segment in pieces) {
      when (segment) {
        is Segment.Run -> {
          val run = RemoteViews(packageName, R.layout.nmw_run)
          text(run, R.id.nmw_run, segment.text, segment.glyph, metrics, colors)
          run.setViewLayoutHeight(R.id.nmw_run, metrics.rowHeight, TypedValue.COMPLEX_UNIT_DIP)
          views.addView(R.id.nmw_row, run)
          x += metrics.width(segment.text, segment.glyph)
        }
        is Segment.Slot -> {
          views.addView(R.id.nmw_row, slot(config.motion, segment, metrics, colors, late = bills > 0))
          val width = max(metrics.width(segment.from, segment.glyph), metrics.width(segment.to, segment.glyph))
          if (segment.wholeDigit || !changeWhole) {
            if (segment.wholeDigit && !changeWhole) {
              changeWhole = true
              changeStart = null
            }
            if (changeStart == null) changeStart = x
            changeEnd = x + width
          }
          x += width
        }
      }
    }
    val rowWidth = x

    val changeCenter = ((changeStart ?: 0f) + changeEnd) / 2
    val targetX = if (start) changeCenter + geometry.paddingX - geometry.halfWidth else changeCenter - rowWidth / 2
    ambient?.let { field ->
      landings.forEach { landing ->
        views.addView(R.id.nmw_over, flight(field.slots[landing.index], landing.spot, targetX, geometry.offsetY, start, geometry))
      }
      views.addView(R.id.nmw_ambient, ambientLayer(config.effect, field, seconds, start, geometry))
    }

    val landed = slots.isNotEmpty() && rising
    if (landed) {
      trigger(views, R.id.nmw_bump)
    } else {
      views.setDisplayedChild(R.id.nmw_bump, 1)
    }
    if (config.background == "glow") {
      aurora(views, colors, geometry, seconds, if (!landed) PULSE_NONE else if (wholeChanged) PULSE_WHOLE else PULSE_CENTS)
    }
    return views
  }

  private fun pick(ambient: MoneyAmbient, seconds: Double, count: Int, time: Long): List<Int> {
    if (count == 0) return emptyList()
    val candidates = ambient.slots.indices.filter { index ->
      val spot = ambient.spot(index, seconds)
      !ambient.isHidden(index, seconds) && ambient.isVisible(spot)
    }
    return candidates.shuffled(java.util.Random(time)).take(count)
  }

  private fun ambientLayer(effect: String, ambient: MoneyAmbient, seconds: Double, start: Boolean, geometry: Geometry): RemoteViews {
    val views = RemoteViews(packageName, AMBIENT_LAYOUTS.getValue(effect).let { if (start) it.second else it.first })
    val total = MoneyEffects.slots[effect].orEmpty().size
    for (index in ambient.slots.size until total) views.setViewVisibility(AMBIENT_SLOTS[index], View.GONE)
    ambient.slots.indices.forEach { index ->
      val spot = ambient.spot(index, seconds)
      if (ambient.isHidden(index, seconds)) {
        views.setViewVisibility(AMBIENT_SLOTS[index], View.GONE)
        return@forEach
      }
      val image = AMBIENT_BILLS[index]
      views.setViewLayoutWidth(image, spot.size, TypedValue.COMPLEX_UNIT_DIP)
      views.setViewLayoutHeight(image, spot.size, TypedValue.COMPLEX_UNIT_DIP)
      val left = if (start) spot.x + geometry.halfWidth - spot.size / 2 else spot.x
      views.setViewLayoutMargin(image, RemoteViews.MARGIN_LEFT, left, TypedValue.COMPLEX_UNIT_DIP)
      views.setViewLayoutMargin(image, RemoteViews.MARGIN_TOP, spot.y, TypedValue.COMPLEX_UNIT_DIP)
      mirror(views, image, spot)
    }
    return views
  }

  private fun flight(slot: AmbientSlot, spot: MoneyAmbient.Spot, targetX: Float, targetY: Float, start: Boolean, geometry: Geometry): RemoteViews {
    val fromX = if (start) spot.x + geometry.halfWidth else spot.x
    val toX = if (start) targetX + geometry.halfWidth else targetX
    val rightward = toX >= fromX
    val downward = targetY >= spot.y
    val layout = when {
      rightward && downward -> if (start) R.layout.nmw_fly_lt_start else R.layout.nmw_fly_lt_center
      !rightward && downward -> if (start) R.layout.nmw_fly_rt_start else R.layout.nmw_fly_rt_center
      rightward -> if (start) R.layout.nmw_fly_lb_start else R.layout.nmw_fly_lb_center
      else -> if (start) R.layout.nmw_fly_rb_start else R.layout.nmw_fly_rb_center
    }
    val views = RemoteViews(packageName, layout)
    val width = kotlin.math.abs(toX - fromX) + spot.size
    val height = kotlin.math.abs(targetY - spot.y) + spot.size
    views.setViewLayoutWidth(R.id.nmw_fly_box, width, TypedValue.COMPLEX_UNIT_DIP)
    views.setViewLayoutHeight(R.id.nmw_fly_box, height, TypedValue.COMPLEX_UNIT_DIP)
    val left = if (start) minOf(fromX, toX) - spot.size / 2 else (fromX + toX) / 2
    views.setViewLayoutMargin(R.id.nmw_fly_box, RemoteViews.MARGIN_LEFT, left, TypedValue.COMPLEX_UNIT_DIP)
    views.setViewLayoutMargin(R.id.nmw_fly_box, RemoteViews.MARGIN_TOP, (spot.y + targetY) / 2, TypedValue.COMPLEX_UNIT_DIP)
    views.setViewLayoutWidth(R.id.nmw_fly_bill, spot.size, TypedValue.COMPLEX_UNIT_DIP)
    views.setViewLayoutHeight(R.id.nmw_fly_bill, spot.size, TypedValue.COMPLEX_UNIT_DIP)
    views.setFloat(R.id.nmw_fly_bill, "setRotation", slot.rotation)
    mirror(views, R.id.nmw_fly_bill, spot)
    views.setFloat(R.id.nmw_fly_bill, "setAlpha", slot.alpha.coerceAtLeast(0.85f))
    trigger(views, R.id.nmw_fly)
    return views
  }

  private fun text(
    views: RemoteViews,
    id: Int,
    value: String,
    glyph: Glyph,
    metrics: CounterMetrics,
    colors: MoneyColors,
    onBaseline: Boolean = true,
  ) {
    val color = if (glyph == Glyph.BIG) colors.ink else colors.muted
    views.setTextViewText(id, value)
    views.setTextViewTextSize(id, TypedValue.COMPLEX_UNIT_DIP, metrics.size(glyph))
    views.setColorInt(id, "setTextColor", color.day, color.night)
    if (glyph == Glyph.SMALL && onBaseline) views.setViewPadding(id, 0, metrics.smallPaddingPx, 0, 0)
  }

  // Out and in each get their own trigger: a view hidden before its first layout has no size, so
  // a single flipper can't animate both.
  private fun slot(motion: String, segment: Segment.Slot, metrics: CounterMetrics, colors: MoneyColors, late: Boolean): RemoteViews {
    val layouts = if (late) SLOT_LATE_LAYOUTS else SLOT_LAYOUTS
    val views = RemoteViews(packageName, layouts[motion] ?: layouts.getValue("roll"))
    val small = segment.glyph == Glyph.SMALL
    views.setViewLayoutHeight(R.id.nmw_slot, if (small) metrics.smallRowHeight else metrics.rowHeight, TypedValue.COMPLEX_UNIT_DIP)
    if (small) {
      views.setViewLayoutMargin(R.id.nmw_slot, RemoteViews.MARGIN_TOP, metrics.smallPaddingPx / metrics.density, TypedValue.COMPLEX_UNIT_DIP)
    }
    text(views, R.id.nmw_slot_a, segment.from, segment.glyph, metrics, colors, onBaseline = false)
    text(views, R.id.nmw_slot_b, segment.to, segment.glyph, metrics, colors, onBaseline = false)
    if (segment.from.isNotEmpty()) trigger(views, R.id.nmw_slot_out) else views.setViewVisibility(R.id.nmw_slot_out, View.GONE)
    trigger(views, R.id.nmw_slot_in)
    return views
  }

  private fun aurora(views: RemoteViews, colors: MoneyColors, geometry: Geometry, seconds: Double, pulse: Int) {
    views.setViewVisibility(R.id.nmw_aurora, View.VISIBLE)
    val scale = (max(geometry.halfWidth, geometry.halfHeight) * 2 / AURORA_REFERENCE).coerceIn(0.45f, 1.7f)
    MoneyAurora.blobs.forEachIndexed { index, blob ->
      val size = blob.size * scale
      val legs = ((seconds / blob.leg + blob.phase * 2) % 2 + 2) % 2
      val forward = legs < 1
      val offset = if (forward) legs * 2 - 1 else 1 - (legs - 1) * 2
      val travel = (offset * blob.amplitude * size).toFloat()
      val direction = if (forward) 0 else 1
      val image = MoneyAurora.images[index][direction][pulse]
      views.setViewVisibility(MoneyAurora.containers[index][direction][pulse], View.VISIBLE)
      views.setViewLayoutWidth(image, size, TypedValue.COMPLEX_UNIT_DIP)
      views.setViewLayoutHeight(image, size, TypedValue.COMPLEX_UNIT_DIP)
      views.setViewLayoutMargin(image, RemoteViews.MARGIN_LEFT, blob.baseX * geometry.halfWidth + blob.dirX * travel, TypedValue.COMPLEX_UNIT_DIP)
      views.setViewLayoutMargin(image, RemoteViews.MARGIN_TOP, blob.baseY * geometry.halfHeight + blob.dirY * travel, TypedValue.COMPLEX_UNIT_DIP)
      tint(views, image, if (blob.deep) colors.accentDeep else colors.accent)
    }
  }

  private fun liveDot(colors: MoneyColors): RemoteViews {
    val views = RemoteViews(packageName, R.layout.nmw_live)
    tint(views, PARTICLE_IMAGES[0], colors.accent)
    tint(views, PARTICLE_IMAGES[1], colors.accent)
    trigger(views, PARTICLES[0])
    trigger(views, PARTICLES[1])
    return views
  }

  private fun mirror(views: RemoteViews, id: Int, spot: MoneyAmbient.Spot) {
    if (spot.flipX) views.setFloat(id, "setScaleX", -1f)
    if (spot.flipY) views.setFloat(id, "setScaleY", -1f)
  }

  private fun tint(views: RemoteViews, id: Int, color: ColorPair) {
    views.setColorInt(id, "setColorFilter", color.day, color.night)
  }

  // Flipping to child 0 then 1 plays the in-animation on the child's first draw, i.e. when the
  // launcher flips to the frame.
  private fun trigger(views: RemoteViews, id: Int) {
    views.setDisplayedChild(id, 0)
    views.setDisplayedChild(id, 1)
  }

  private fun px(dp: Float) = (dp * density).toInt()

  companion object {
    const val MAX_FRAMES = 150
    private const val AURORA_REFERENCE = 320f
    private const val PULSE_NONE = 0
    private const val PULSE_CENTS = 1
    private const val PULSE_WHOLE = 2
    private const val SNAPSHOT_EVERY = 15
    private const val MAX_REPLAY = 10 * 60_000L
    private const val MIN_FRAMES = 20
    private const val MAX_BYTES = 420_000
    private const val REFERENCE_SIZE = 40f
    // Keep in sync with the header and caption height in nmw_widget.xml.
    private const val LABEL_HEIGHT = 18f

    private val SLOT_LAYOUTS = mapOf(
      "roll" to R.layout.nmw_slot_roll,
      "drop" to R.layout.nmw_slot_drop,
      "flip" to R.layout.nmw_slot_flip,
      "blur" to R.layout.nmw_slot_blur,
      "slot" to R.layout.nmw_slot_slot,
    )
    private val SLOT_LATE_LAYOUTS = mapOf(
      "roll" to R.layout.nmw_slot_roll_late,
      "drop" to R.layout.nmw_slot_drop_late,
      "flip" to R.layout.nmw_slot_flip_late,
      "blur" to R.layout.nmw_slot_blur_late,
      "slot" to R.layout.nmw_slot_slot_late,
    )
    private val AMBIENT_LAYOUTS = mapOf(
      "rain" to (R.layout.nmw_amb_rain_center to R.layout.nmw_amb_rain_start),
      "stream" to (R.layout.nmw_amb_stream_center to R.layout.nmw_amb_stream_start),
      "fountain" to (R.layout.nmw_amb_fountain_center to R.layout.nmw_amb_fountain_start),
      "orbit" to (R.layout.nmw_amb_orbit_center to R.layout.nmw_amb_orbit_start),
    )
    private val AMBIENT_SLOTS = intArrayOf(
      R.id.nmw_a0, R.id.nmw_a1, R.id.nmw_a2, R.id.nmw_a3, R.id.nmw_a4,
      R.id.nmw_a5, R.id.nmw_a6, R.id.nmw_a7, R.id.nmw_a8, R.id.nmw_a9,
    )
    private val AMBIENT_BILLS = intArrayOf(
      R.id.nmw_ai0, R.id.nmw_ai1, R.id.nmw_ai2, R.id.nmw_ai3, R.id.nmw_ai4,
      R.id.nmw_ai5, R.id.nmw_ai6, R.id.nmw_ai7, R.id.nmw_ai8, R.id.nmw_ai9,
    )
    private val PARTICLES = intArrayOf(R.id.nmw_p0, R.id.nmw_p1)
    private val PARTICLE_IMAGES = intArrayOf(R.id.nmw_i0, R.id.nmw_i1)
  }
}
