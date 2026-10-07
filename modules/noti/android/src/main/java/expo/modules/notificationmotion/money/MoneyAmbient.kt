package expo.modules.notificationmotion.money

import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin

/**
 * Where each background bill is at any instant. The layout animations move every bill at a
 * constant velocity, one second per frame; this computes the same paths, so a frame can place
 * each bill where the previous frame's animation left it, and can fly a bill into the counter
 * from exactly where it is.
 *
 * Each pass across the widget gets a lane and a random mirroring when the bill re-enters,
 * off screen. Lanes favor the emptier side, so the bills stay spread over the whole widget.
 * Those choices depend on where the other bills are, so the state is saved with [snapshot] and
 * carried across re-syncs with [restore]. Coordinates are dp from the frame's center, y down.
 */
internal class MoneyAmbient(
  private val effect: String,
  /** The bill unit in dp; slot sizes are multiples of it. */
  val unit: Float,
  private val halfWidth: Float,
  private val halfHeight: Float,
  /** How many of the effect's bills are in play; energy decides. */
  count: Int,
) {
  class Spot(
    val x: Float,
    val y: Float,
    val size: Float,
    val cycle: Long,
    val flipX: Boolean,
    val flipY: Boolean,
  )

  private class Progress(val cycle: Long, val along: Float, val elapsed: Float)

  /** One pass's lane, as a share of the room across the widget, from -1 to 1. */
  private class Lane(val cycle: Long, val position: Float)

  val slots: List<AmbientSlot> = MoneyEffects.slots[effect].orEmpty().take(count)
  private val orbit = effect == "orbit"
  private val alongY = effect != "stream"

  /**
   * A bill that flew into the counter starts a new pass from its edge right away, so the
   * background keeps flowing: this is how far each bill was pushed along its path.
   */
  private val skipped = mutableMapOf<Int, Double>()
  /** Orbiting bills have no edge to come back from; they reappear after a moment instead. */
  private val hiddenUntil = mutableMapOf<Int, Double>()
  private val lanes = mutableMapOf<Int, Lane>()

  /** Whether a snapshot was taken with this exact setup; otherwise its state doesn't apply. */
  val key: String = listOf(effect, slots.size, unit, halfWidth, halfHeight).joinToString("/")

  fun spot(index: Int, seconds: Double): Spot {
    val slot = slots[index]
    val size = slot.size * unit
    if (orbit) {
      val degrees = slot.phase * 360.0 + slot.spin * seconds
      val radius = slot.radius * halfWidth
      val radians = Math.toRadians(degrees)
      // An orbiting bill never leaves the screen, so its mirroring never changes.
      return Spot((radius * cos(radians)).toFloat(), (radius * sin(radians)).toFloat(), size, 0, flip(index, 0, 1), flip(index, 0, 2))
    }
    val progress = progress(index, seconds)
    val room = room(size)
    val lane = lanes[index]?.takeIf { it.cycle == progress.cycle } ?: chooseLane(index, progress.cycle, seconds).also { lanes[index] = it }
    val cross = lane.position * room
    val vx = slot.vx * size
    val vy = slot.vy * size
    val flipX = flip(index, progress.cycle, 1)
    val flipY = flip(index, progress.cycle, 2)
    return if (alongY) {
      val y = if (vy >= 0) -halfHeight - size + progress.along else halfHeight + size - progress.along
      Spot(cross + vx * progress.elapsed, y, size, progress.cycle, flipX, flipY)
    } else {
      val x = if (vx >= 0) -halfWidth - size + progress.along else halfWidth + size - progress.along
      Spot(x, cross + vy * progress.elapsed, size, progress.cycle, flipX, flipY)
    }
  }

  /** How far along its path a bill is. Doubles throughout: at epoch-scale times a Float loses
   * the position entirely. */
  private fun progress(index: Int, seconds: Double): Progress {
    val slot = slots[index]
    val size = slot.size * unit
    val speed = abs(if (alongY) slot.vy * size else slot.vx * size).toDouble()
    val span = span(size)
    val travelled = seconds * speed + slot.phase * span + (skipped[index] ?: 0.0)
    val cycle = floor(travelled / span).toLong()
    val along = (travelled - cycle * span).toFloat()
    return Progress(cycle, along, along / speed.toFloat())
  }

  private fun span(size: Float) = (if (alongY) halfHeight else halfWidth) * 2.0 + size * 2.0

  private fun room(size: Float) = ((if (alongY) halfWidth else halfHeight) - size / 2).coerceAtLeast(0f)

  /**
   * Picks a lane for a pass that's starting. The widget is split into bands across the flow;
   * a band with fewer bills in it right now is far more likely, so when one side gets crowded
   * the next bills come in on the other.
   */
  private fun chooseLane(index: Int, cycle: Long, seconds: Double): Lane {
    val counts = IntArray(BANDS)
    lanes.forEach { (other, lane) ->
      if (other == index || other >= slots.size) return@forEach
      if (progress(other, seconds).cycle != lane.cycle) return@forEach
      val band = (((lane.position + 1) / 2) * BANDS).toInt().coerceIn(0, BANDS - 1)
      counts[band] += 1
    }
    val random = java.util.Random(seed(index, cycle, 0))
    val weights = counts.map { 1.0 / ((1 + it) * (1 + it) * (1 + it)) }
    var pick = random.nextDouble() * weights.sum()
    var band = 0
    while (band < BANDS - 1 && pick > weights[band]) {
      pick -= weights[band]
      band += 1
    }
    val within = random.nextFloat()
    return Lane(cycle, ((band + within) / BANDS) * 2 - 1)
  }

  private fun flip(index: Int, cycle: Long, salt: Int): Boolean = java.util.Random(seed(index, cycle, salt)).nextBoolean()

  private fun seed(index: Int, cycle: Long, salt: Int) = index * 73_856_093L xor cycle * 19_349_663L xor salt * 83_492_791L

  fun isHidden(index: Int, seconds: Double): Boolean = seconds < (hiddenUntil[index] ?: Double.NEGATIVE_INFINITY)

  /** Takes the bill out of the background at [seconds]: it flies to the counter instead. */
  fun collect(index: Int, seconds: Double) {
    if (orbit) {
      hiddenUntil[index] = seconds + ORBIT_RETURN
      return
    }
    // Push the bill to the start of its next pass: just outside its entry edge.
    val slot = slots[index]
    val size = slot.size * unit
    val speed = abs(if (alongY) slot.vy * size else slot.vx * size).toDouble()
    val span = span(size)
    val travelled = seconds * speed + slot.phase * span + (skipped[index] ?: 0.0)
    skipped[index] = (skipped[index] ?: 0.0) + (floor(travelled / span) + 1) * span - travelled
  }

  /** Whether the whole bill is inside the widget, so its flight starts somewhere you can see. */
  fun isVisible(spot: Spot): Boolean =
    abs(spot.x) <= halfWidth - spot.size / 2 && abs(spot.y) <= halfHeight - spot.size / 2

  fun snapshot(): JSONObject = JSONObject()
    .put("key", key)
    .put("skipped", JSONObject(skipped.mapKeys { it.key.toString() }))
    .put("hidden", JSONObject(hiddenUntil.mapKeys { it.key.toString() }))
    .put("lanes", JSONObject(lanes.entries.associate { (index, lane) -> index.toString() to "${lane.cycle}:${lane.position}" }))

  /** Picks up a [snapshot] taken with the same setup. */
  fun restore(state: JSONObject): Boolean {
    if (state.optString("key") != key) return false
    state.optJSONObject("skipped")?.let { json -> json.keys().forEach { skipped[it.toInt()] = json.getDouble(it) } }
    state.optJSONObject("hidden")?.let { json -> json.keys().forEach { hiddenUntil[it.toInt()] = json.getDouble(it) } }
    state.optJSONObject("lanes")?.let { json ->
      json.keys().forEach { index ->
        val (cycle, position) = json.getString(index).split(":")
        lanes[index.toInt()] = Lane(cycle.toLong(), position.toFloat())
      }
    }
    return true
  }

  private companion object {
    const val ORBIT_RETURN = 3.0
    const val BANDS = 5
  }
}
