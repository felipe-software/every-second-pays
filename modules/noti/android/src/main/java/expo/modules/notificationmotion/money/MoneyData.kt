package expo.modules.notificationmotion.money

import android.graphics.Color
import org.json.JSONArray
import org.json.JSONObject

/**
 * Earnings as a piecewise-linear function of time, published by the app. Each breakpoint holds
 * the total at that instant (in cents) and the rate after it (cents per millisecond), so the
 * widget can count without the app: between breakpoints the total grows linearly, and period
 * resets are breakpoints whose value drops back.
 */
internal class MoneySchedule(
  private val times: LongArray,
  private val values: DoubleArray,
  private val rates: DoubleArray,
) {
  val isEmpty get() = times.isEmpty()
  val horizon get() = if (times.isEmpty()) 0L else times.last()

  private fun index(time: Long): Int {
    var low = 0
    var high = times.size - 1
    var found = -1
    while (low <= high) {
      val middle = (low + high) ushr 1
      if (times[middle] <= time) {
        found = middle
        low = middle + 1
      } else {
        high = middle - 1
      }
    }
    return found
  }

  /** Total in cents at `time`. Before the first breakpoint the schedule holds its first value. */
  fun valueAt(time: Long): Double {
    if (times.isEmpty()) return 0.0
    val at = index(time)
    if (at < 0) return values[0]
    return values[at] + rates[at] * (time - times[at])
  }

  /** Cents per millisecond at `time`. */
  fun rateAt(time: Long): Double {
    val at = index(time)
    return if (at < 0) 0.0 else rates[at]
  }

  /** The next instant the rate or the total jumps (a shift edge or a period reset). */
  fun nextBreakpoint(time: Long): Long? {
    val at = index(time) + 1
    return if (at in times.indices) times[at] else null
  }

  companion object {
    val EMPTY = MoneySchedule(LongArray(0), DoubleArray(0), DoubleArray(0))

    fun parse(array: JSONArray?): MoneySchedule {
      if (array == null || array.length() == 0) return EMPTY
      val size = array.length()
      val times = LongArray(size)
      val values = DoubleArray(size)
      val rates = DoubleArray(size)
      for (index in 0 until size) {
        val point = array.getJSONArray(index)
        times[index] = point.getLong(0)
        values[index] = point.getDouble(1)
        rates[index] = point.getDouble(2).coerceAtLeast(0.0)
      }
      return MoneySchedule(times, values, rates)
    }
  }
}

/** A color that follows the launcher's day/night mode; both halves match for a fixed theme. */
internal data class ColorPair(val day: Int, val night: Int) {
  fun withAlpha(alpha: Float) = ColorPair(applyAlpha(day, alpha), applyAlpha(night, alpha))

  private fun applyAlpha(color: Int, alpha: Float) =
    Color.argb((Color.alpha(color) * alpha).toInt().coerceIn(0, 255), Color.red(color), Color.green(color), Color.blue(color))
}

internal data class MoneyColors(
  val canvas: ColorPair,
  val row: ColorPair,
  val ink: ColorPair,
  val muted: ColorPair,
  val accent: ColorPair,
  val accentDeep: ColorPair,
)

internal data class MoneyFormat(
  val currency: String,
  val decimal: String,
  val group: String,
  val groupSize: Int,
)

/** Everything the app publishes: schedules, palettes, number format, and translated labels. */
internal class MoneyData(private val json: JSONObject) {
  val appPeriod: String = json.optString("appPeriod", "today")
  val hasSources: Boolean = json.optBoolean("hasSources", false)
  val format = json.optJSONObject("format").let { format ->
    MoneyFormat(
      currency = format?.optString("currency", "$") ?: "$",
      decimal = format?.optString("decimal", ".") ?: ".",
      group = format?.optString("group", ",") ?: ",",
      groupSize = (format?.optInt("groupSize", 3) ?: 3).coerceIn(0, 4),
    )
  }
  private val labels = json.optJSONObject("labels") ?: JSONObject()
  private val appearance = json.optJSONObject("appearance") ?: JSONObject()
  private val palettes = json.optJSONObject("palettes") ?: JSONObject()
  private val schedules = mutableMapOf<String, MoneySchedule>()

  /** The palette and appearance values that change the widget's look, for change detection. */
  val lookSignature: String =
    listOf(appearance.toString(), palettes.toString(), labels.toString(), json.optJSONObject("format")?.toString(), hasSources).joinToString("|")

  fun label(key: String, fallback: String): String = labels.optString(key, fallback).ifEmpty { fallback }

  fun period(config: MoneyConfig) = if (config.period == "app") appPeriod else config.period

  fun schedule(period: String): MoneySchedule = schedules.getOrPut(period) {
    MoneySchedule.parse(json.optJSONObject("schedules")?.optJSONArray(period))
  }

  fun colors(config: MoneyConfig): MoneyColors {
    val paletteId = if (config.palette == "app") appearance.optString("palette", "green") else config.palette
    val palette = palettes.optJSONObject(paletteId) ?: palettes.optJSONObject("green")
    val mode = if (config.theme == "app") appearance.optString("mode", "system") else config.theme
    val light = palette?.optJSONObject("light")
    val dark = palette?.optJSONObject("dark")
    fun pair(key: String, lightFallback: String, darkFallback: String): ColorPair {
      val day = parse(light?.optString(key), lightFallback)
      val night = parse(dark?.optString(key), darkFallback)
      return when (mode) {
        "light" -> ColorPair(day, day)
        "dark" -> ColorPair(night, night)
        else -> ColorPair(day, night)
      }
    }
    return MoneyColors(
      canvas = pair("canvas", "#F0F7F3", "#141816"),
      row = pair("row", "#E5ECE8", "#292D2B"),
      ink = pair("ink", "#131C17", "#EBF0ED"),
      muted = pair("muted", "#36433C", "#9AA7A0"),
      accent = pair("accent", "#58AD85", "#58AD85"),
      accentDeep = pair("accentDeep", "#28664A", "#8CC4A7"),
    )
  }

  private fun parse(value: String?, fallback: String): Int =
    runCatching { Color.parseColor(value ?: fallback) }.getOrElse { Color.parseColor(fallback) }

  companion object {
    fun parse(serialized: String?): MoneyData =
      MoneyData(serialized?.let { runCatching { JSONObject(it) }.getOrNull() } ?: JSONObject())
  }
}

/** One widget's customization. Unknown values fall back to the defaults. */
internal data class MoneyConfig(
  val template: String,
  val effect: String,
  val motion: String,
  val intensity: String,
  val period: String,
  val palette: String,
  val theme: String,
  val background: String,
  val cents: Boolean,
  val caption: Boolean,
) {
  fun toJson(): String = JSONObject()
    .put("template", template)
    .put("effect", effect)
    .put("motion", motion)
    .put("intensity", intensity)
    .put("period", period)
    .put("palette", palette)
    .put("theme", theme)
    .put("background", background)
    .put("cents", cents)
    .put("caption", caption)
    .toString()

  companion object {
    private fun JSONObject.pick(key: String, allowed: Set<String>, fallback: String): String =
      optString(key).takeIf { it in allowed } ?: fallback

    val TEMPLATES = setOf("hero", "ledger", "minimal")
    val EFFECTS = setOf("none", "rain", "stream", "fountain", "orbit")
    val MOTIONS = setOf("roll", "drop", "flip", "blur", "slot")
    val INTENSITIES = setOf("calm", "lively", "wild")
    val PERIODS = setOf("app", "today", "week", "month", "year")
    val PALETTES = setOf("app", "orange", "green", "blue", "rose", "lavender")
    val THEMES = setOf("app", "system", "light", "dark")
    val BACKGROUNDS = setOf("glow", "solid", "glass")

    fun parse(serialized: String?): MoneyConfig {
      val json = serialized?.let { runCatching { JSONObject(it) }.getOrNull() } ?: JSONObject()
      return MoneyConfig(
        template = json.pick("template", TEMPLATES, "minimal"),
        effect = json.pick("effect", EFFECTS, "rain"),
        motion = json.pick("motion", MOTIONS, "roll"),
        intensity = json.pick("intensity", INTENSITIES, "lively"),
        period = json.pick("period", PERIODS, "app"),
        palette = json.pick("palette", PALETTES, "app"),
        theme = json.pick("theme", THEMES, "app"),
        background = json.pick("background", BACKGROUNDS, "glow"),
        cents = json.optBoolean("cents", true),
        caption = json.optBoolean("caption", true),
      )
    }
  }
}
