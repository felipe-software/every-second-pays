package expo.modules.notificationmotion.money

import android.content.Context
import android.graphics.Paint
import android.graphics.Typeface
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.roundToLong

/** How a counter character is drawn: the whole amount is large, everything else is small. */
internal enum class Glyph { BIG, SMALL }

internal data class CounterChar(val text: String, val glyph: Glyph)

/** A counter split into characters, the currency first. */
internal class CounterText(val chars: List<CounterChar>) {
  val plain get() = chars.joinToString("") { it.text }

  companion object {
    /** Matches the app: totals are rounded to the cent; hiding cents drops them. */
    fun cents(value: Double): Long = max(0.0, value).roundToLong()

    fun format(cents: Long, format: MoneyFormat, showCents: Boolean): CounterText {
      val whole = (if (showCents) cents / 100 else floor(cents / 100.0).toLong()).toString()
      val grouped = StringBuilder()
      whole.forEachIndexed { index, digit ->
        val remaining = whole.length - index
        if (index > 0 && format.groupSize > 0 && remaining % format.groupSize == 0) grouped.append(format.group)
        grouped.append(digit)
      }
      val chars = mutableListOf<CounterChar>()
      // A hair space keeps the currency off the first digit, like the app's 4 pt margin.
      chars += CounterChar(format.currency + " ", Glyph.SMALL)
      grouped.forEach { chars += CounterChar(it.toString(), Glyph.BIG) }
      if (showCents) {
        chars += CounterChar(format.decimal, Glyph.SMALL)
        (cents % 100).toString().padStart(2, '0').forEach { chars += CounterChar(it.toString(), Glyph.SMALL) }
      }
      return CounterText(chars)
    }
  }
}

/** A run of characters that didn't change, or a slot whose character animates old → new. */
internal sealed interface Segment {
  val glyph: Glyph
  data class Run(val text: String, override val glyph: Glyph) : Segment
  data class Slot(val from: String, val to: String, override val glyph: Glyph, val wholeDigit: Boolean) : Segment
}

/**
 * Splits `next` into runs and slots against `previous`, comparing from the right so the cents
 * line up even when the total gains a digit (9.99 → 10.00 animates every column).
 */
internal fun segments(previous: CounterText?, next: CounterText): List<Segment> {
  val output = mutableListOf<Segment>()
  val offset = next.chars.size - (previous?.chars?.size ?: 0)
  val run = StringBuilder()
  var runGlyph: Glyph? = null
  fun flush() {
    if (run.isNotEmpty()) output += Segment.Run(run.toString(), runGlyph!!)
    run.clear()
    runGlyph = null
  }
  next.chars.forEachIndexed { index, char ->
    // The currency (index 0) never animates, and a new leading digit enters from nothing.
    val mapped = index - offset
    val old = when {
      previous == null || index == 0 -> char.text
      mapped <= 0 -> ""
      else -> previous.chars.getOrNull(mapped)?.text.orEmpty()
    }
    if (old == char.text) {
      if (runGlyph != null && runGlyph != char.glyph) flush()
      runGlyph = char.glyph
      run.append(char.text)
    } else {
      flush()
      output += Segment.Slot(old, char.text, char.glyph, char.glyph == Glyph.BIG && char.text.firstOrNull()?.isDigit() == true)
    }
  }
  flush()
  return output
}

/** Font metrics for one counter size, in dp. */
internal class CounterMetrics(
  val bigSize: Float,
  val smallSize: Float,
  val rowHeight: Float,
  /** A line of small text: cents slots roll within this, not the whole row. */
  val smallRowHeight: Float,
  /** Top padding (px) that puts small text on the big text's baseline. */
  val smallPaddingPx: Int,
  private val big: Paint,
  private val small: Paint,
  val density: Float,
) {
  fun size(glyph: Glyph) = if (glyph == Glyph.BIG) bigSize else smallSize

  fun width(text: String, glyph: Glyph): Float =
    (if (glyph == Glyph.BIG) big else small).measureText(text) / density

  fun width(text: CounterText): Float = text.chars.sumOf { width(it.text, it.glyph).toDouble() }.toFloat()
}

internal class MoneyTypography(private val context: Context) {
  private val density = context.resources.displayMetrics.density
  // Launchers don't resolve an app's font resources inside RemoteViews, so the widget uses the
  // system sans; measuring with the same face keeps bursts on the digits they belong to.
  private val bold: Typeface = Typeface.create("sans-serif", Typeface.BOLD)

  private fun paint(sizeDp: Float) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    typeface = bold
    textSize = sizeDp * density
    fontFeatureSettings = "tnum"
    letterSpacing = LETTER_SPACING
  }

  fun metrics(bigSize: Float): CounterMetrics {
    val smallSize = bigSize * SMALL_RATIO
    val big = paint(bigSize)
    val small = paint(smallSize)
    val bigMetrics = big.fontMetrics
    val smallMetrics = small.fontMetrics
    return CounterMetrics(
      bigSize = bigSize,
      smallSize = smallSize,
      rowHeight = ceil((bigMetrics.descent - bigMetrics.ascent) / density),
      smallRowHeight = ceil((smallMetrics.descent - smallMetrics.ascent) / density),
      smallPaddingPx = (-bigMetrics.ascent + smallMetrics.ascent).toInt().coerceAtLeast(0),
      big = big,
      small = small,
      density = density,
    )
  }

  /** The largest size where the widest counter fits the box. */
  fun fit(widest: CounterText, width: Float, height: Float, maxSize: Float): CounterMetrics {
    var low = 12f
    var high = maxSize
    repeat(14) {
      val middle = (low + high) / 2
      val metrics = metrics(middle)
      if (metrics.width(widest) <= width && metrics.rowHeight <= height) low = middle else high = middle
    }
    return metrics(floor(low * 2) / 2)
  }

  companion object {
    const val SMALL_RATIO = 0.46f
    /** A slight negative tracking, like the app's tight total. */
    const val LETTER_SPACING = -0.02f
  }
}

/**
 * The frames the launcher flips through until the app re-syncs: the total sampled every `tick`
 * from `startAt`. A frame never runs ahead of the real total; it trails by at most one unit.
 */
internal class MoneyTimeline(
  val startAt: Long,
  val tick: Long,
  val cents: LongArray,
  val nextSyncAt: Long,
  val ratePerHour: Double,
) {
  /** What the launcher is probably showing at `time`, assuming it never paused. */
  fun shownAt(time: Long): Long? {
    if (cents.isEmpty() || time < startAt) return null
    val index = ((time - startAt) / tick).toInt().coerceAtMost(cents.size - 1)
    return cents[index]
  }

  companion object {
    /** The flipper's interval, fixed in nmw_widget.xml: AdapterViewFlipper's isn't remotable.
     * Slower totals just repeat a frame, and a frame that changes nothing doesn't animate. */
    const val TICK = 1_000L
    private const val IDLE_SYNC = 30 * 60_000L

    fun build(schedule: MoneySchedule, now: Long, maxFrames: Int): MoneyTimeline {
      val rate = schedule.rateAt(now)
      val ratePerHour = rate * 3_600_000 / 100
      val nextBreakpoint = schedule.nextBreakpoint(now)
      if (rate <= 0.0) {
        val sync = minOf(nextBreakpoint ?: Long.MAX_VALUE, now + IDLE_SYNC)
        return MoneyTimeline(now, TICK, longArrayOf(CounterText.cents(schedule.valueAt(now))), sync, 0.0)
      }
      val tick = TICK
      val count = maxFrames.coerceAtLeast(2)
      val cents = LongArray(count) { CounterText.cents(schedule.valueAt(now + it * tick)) }
      // Re-sync well before the last frame: the launcher's flipper loops back to frame 0.
      val window = tick * (count - 1)
      val sync = minOf(now + window * 2 / 5, nextBreakpoint ?: Long.MAX_VALUE).coerceAtLeast(now + 15_000)
      return MoneyTimeline(now, tick, cents, sync, ratePerHour)
    }
  }
}
