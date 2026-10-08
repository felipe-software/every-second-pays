package expo.modules.notificationmotion.money

import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin

// Must trace the same paths as the generated layout animations (constant velocity, one second
// per frame). Coordinates are dp from the frame's center, y down.
internal class MoneyAmbient(
  private val effect: String,
  val unit: Float,
  private val halfWidth: Float,
  private val halfHeight: Float,
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

  private class Lane(val cycle: Long, val position: Float)

  val slots: List<AmbientSlot> = MoneyEffects.slots[effect].orEmpty().take(count)
  private val orbit = effect == "orbit"
  private val alongY = effect != "stream"

  private val skipped = mutableMapOf<Int, Double>()
  private val hiddenUntil = mutableMapOf<Int, Double>()
  private val lanes = mutableMapOf<Int, Lane>()

  val key: String = listOf(effect, slots.size, unit, halfWidth, halfHeight).joinToString("/")

  fun spot(index: Int, seconds: Double): Spot {
    val slot = slots[index]
    val size = slot.size * unit
    if (orbit) {
      val degrees = slot.phase * 360.0 + slot.spin * seconds
      val radius = slot.radius * halfWidth
      val radians = Math.toRadians(degrees)
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

  // Doubles throughout: at epoch-scale times a Float loses the position entirely.
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

  fun collect(index: Int, seconds: Double) {
    if (orbit) {
      hiddenUntil[index] = seconds + ORBIT_RETURN
      return
    }
    val slot = slots[index]
    val size = slot.size * unit
    val speed = abs(if (alongY) slot.vy * size else slot.vx * size).toDouble()
    val span = span(size)
    val travelled = seconds * speed + slot.phase * span + (skipped[index] ?: 0.0)
    skipped[index] = (skipped[index] ?: 0.0) + (floor(travelled / span) + 1) * span - travelled
  }

  fun isVisible(spot: Spot): Boolean =
    abs(spot.x) <= halfWidth - spot.size / 2 && abs(spot.y) <= halfHeight - spot.size / 2

  fun snapshot(): JSONObject = JSONObject()
    .put("key", key)
    .put("skipped", JSONObject(skipped.mapKeys { it.key.toString() }))
    .put("hidden", JSONObject(hiddenUntil.mapKeys { it.key.toString() }))
    .put("lanes", JSONObject(lanes.entries.associate { (index, lane) -> index.toString() to "${lane.cycle}:${lane.position}" }))

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
