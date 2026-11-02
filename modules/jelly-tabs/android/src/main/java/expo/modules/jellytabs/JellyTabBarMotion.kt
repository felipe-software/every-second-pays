package expo.modules.jellytabs

import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sign
import kotlin.math.sqrt

private const val MAX_FRAME_DELTA_SECONDS = 0.064
// Springs stop once what's left moves pixels by about a quarter or less.
private const val POSITION_REST = 0.001
private const val FILTERED_VELOCITY_REST = 0.02
private const val PRESS_REST = 0.01
private const val PILL_SCALE_REST = 0.002
private const val BAR_SCALE_REST = 0.001
private const val GLOW_REST = 0.03
private const val PANEL_REST_DP = 2.0
private const val TRANSLATE_REST_DP = 0.1
private const val OWNERSHIP_REST = 0.001

private const val PILL_PRESSED_SCALE = 1.2
private const val BAR_PRESSED_SCALE = 1.1
private const val ACTIVE_TAB_PRESSED_GROWTH = 0.2
private const val RELEASE_DISTANCE_FRACTION = 0.025
private const val TAP_SLOP_DP = 4.0
private const val PANEL_OFFSET_DP = 4.0
private const val MAX_DISTORTION_DISTANCE_DP = 700.0
private const val MAX_DISTORTION = 0.08
private const val VERTICAL_FOLLOW = 0.25
private const val VERTICAL_RUBBER_BAND = 0.14

private const val BAR_SPRING_STIFFNESS = 240.0
private const val BAR_SPRING_DAMPING = 18.0
private const val BAR_SPRING_MASS = 0.9

private const val EASE_OUT_CONTROL_POINT_X = 0.58
private const val EASE_OUT_SEARCH_ITERATIONS = 10

private val POSITION_SPRING = SpringSpec(stiffness = 1_000.0, dampingRatio = 1.0)
private val VELOCITY_SPRING = SpringSpec(stiffness = 300.0, dampingRatio = 0.5)
private val PANEL_SPRING = SpringSpec(stiffness = 300.0, dampingRatio = 1.0)
private val PRESS_SPRING = SpringSpec(stiffness = 1_000.0, dampingRatio = 1.0)
private val SCALE_X_SPRING = SpringSpec(stiffness = 250.0, dampingRatio = 0.6)
private val SCALE_Y_SPRING = SpringSpec(stiffness = 250.0, dampingRatio = 0.7)
private val BAR_SPRING = SpringSpec(
  stiffness = BAR_SPRING_STIFFNESS / BAR_SPRING_MASS,
  dampingRatio = BAR_SPRING_DAMPING / (2.0 * sqrt(BAR_SPRING_STIFFNESS * BAR_SPRING_MASS)),
)

private fun cubicBezierCoordinate(parameter: Double, secondControlPoint: Double): Double {
  val inverse = 1.0 - parameter
  return parameter * parameter * (3.0 * inverse * secondControlPoint + parameter)
}

private fun easeOut(input: Double): Double {
  val x = input.coerceIn(0.0, 1.0)
  var low = 0.0
  var high = 1.0
  var parameter = x
  repeat(EASE_OUT_SEARCH_ITERATIONS) {
    if (cubicBezierCoordinate(parameter, EASE_OUT_CONTROL_POINT_X) < x) {
      low = parameter
    } else {
      high = parameter
    }
    parameter = (low + high) / 2.0
  }
  return cubicBezierCoordinate(parameter, 1.0)
}

private fun rubberBand(distance: Double, dimension: Double, coefficient: Double): Double {
  if (distance == 0.0) return 0.0
  val damped = (1.0 - 1.0 / (abs(distance) * coefficient / dimension + 1.0)) * dimension
  return sign(distance) * damped
}

internal class JellyTabBarMotion(density: Float, private val reducedMotion: Boolean) {
  private val density = density.toDouble()
  private val trackInset = TRACK_INSET_DP * this.density

  private var trackWidth = 0.0
  private var trackHeight = 0.0
  private var tabCount = 0

  private val position = Spring(0.0, POSITION_SPRING, POSITION_REST)
  private val filteredVelocity = Spring(0.0, VELOCITY_SPRING, FILTERED_VELOCITY_REST)
  private val panelOffset = Spring(0.0, PANEL_SPRING, PANEL_REST_DP * this.density)
  private val press = Spring(0.0, PRESS_SPRING, PRESS_REST)
  private val pillScaleX = Spring(1.0, SCALE_X_SPRING, PILL_SCALE_REST)
  private val pillScaleY = Spring(1.0, SCALE_Y_SPRING, PILL_SCALE_REST)
  private val barTranslateY = Spring(0.0, BAR_SPRING, TRANSLATE_REST_DP * this.density)
  private val barScaleX = Spring(1.0, BAR_SPRING, BAR_SCALE_REST)
  private val barPressedScale = Spring(1.0, BAR_SPRING, BAR_SCALE_REST)
  private val glowOpacitySpring = Spring(0.0, BAR_SPRING, GLOW_REST)

  private var positionTarget = 0.0
  private var pressTarget = 0.0
  private var pillScaleTarget = 1.0
  private var barPressedScaleTarget = 1.0
  private var glowOpacityTarget = 0.0

  private var isDragging = false
  private var isReleasePending = false
  private var isBarScaleSettling = false
  private var dragStartTarget = 0.0
  private var dragStartPanelOffset = 0.0
  private var dragStartTranslateY = 0.0
  private var downX = 0.0
  private var downRawX = 0.0
  private var movedDistance = 0.0

  var ownsProgress = false
    private set
  var pointerOriginX = 0.0
    private set
  var pointerLocalY = 0.0
    private set

  private val maxTabIndex get() = max(0, tabCount - 1)
  private val tabWidth get() = if (tabCount > 0) max(0.0, (trackWidth - trackInset * 2.0) / tabCount) else 0.0

  val positionValue get() = position.value
  val pillOffsetX get() = position.value * tabWidth
  val activeTabScale get() = 1.0 + ACTIVE_TAB_PRESSED_GROWTH * press.value
  val glowOpacity get() = glowOpacitySpring.value.coerceIn(0.0, 1.0)
  val pressedScale get() = barPressedScale.value
  val distortionScaleX get() = barScaleX.value
  val translateY get() = barTranslateY.value

  val pillScaleXValue: Double
    get() = pillScaleX.value / (1.0 - (velocityScale() * 0.75).coerceIn(-0.2, 0.2))
  val pillScaleYValue: Double
    get() = pillScaleY.value * (1.0 - (velocityScale() * 0.25).coerceIn(-0.2, 0.2))

  val panelTranslateX: Double
    get() {
      if (trackWidth <= 0.0) return 0.0
      val fraction = (panelOffset.value / trackWidth).coerceIn(-1.0, 1.0)
      if (fraction == 0.0) return 0.0
      return sign(fraction) * PANEL_OFFSET_DP * density * easeOut(abs(fraction))
    }

  val isActive: Boolean
    get() = isReleasePending ||
      isBarScaleSettling ||
      !position.isAtRest(positionTarget) ||
      !filteredVelocity.isAtRest(0.0) ||
      !press.isAtRest(pressTarget) ||
      !pillScaleX.isAtRest(pillScaleTarget) ||
      !pillScaleY.isAtRest(pillScaleTarget) ||
      !barPressedScale.isAtRest(barPressedScaleTarget) ||
      !glowOpacitySpring.isAtRest(glowOpacityTarget) ||
      (!isDragging && (!panelOffset.isAtRest(0.0) || !barTranslateY.isAtRest(0.0) || !barScaleX.isAtRest(1.0)))

  private fun velocityScale() = filteredVelocity.value / 10.0

  private fun clampIndex(index: Double) = index.coerceIn(0.0, maxTabIndex.toDouble())

  private fun tabIndexAt(localX: Double) = clampIndex(floor((localX - trackInset) / tabWidth))

  fun setTrack(width: Double, height: Double, count: Int) {
    trackWidth = width
    trackHeight = height
    tabCount = count
    pointerOriginX = width / 2.0
    pointerLocalY = height / 2.0
    positionTarget = clampIndex(positionTarget)
  }

  fun snapToIndex(index: Int) {
    val initial = max(index, 0).toDouble()
    position.snapTo(initial)
    positionTarget = initial
  }

  fun selectIndex(index: Int) {
    if (index >= 0) positionTarget = clampIndex(index.toDouble())
    isReleasePending = true
    pressTarget = 0.0
    pillScaleTarget = 1.0
  }

  fun activateIndex(index: Int) {
    if (tabCount == 0) return
    ownsProgress = true
    positionTarget = clampIndex(index.toDouble())
    isReleasePending = true
  }

  fun followProgress(progress: Double) {
    if (ownsProgress || tabCount == 0) return
    val next = clampIndex(progress)
    position.snapTo(next)
    positionTarget = next
    isReleasePending = false
  }

  fun begin(localX: Double, localY: Double, rawX: Double) {
    barTranslateY.velocity = 0.0
    barScaleX.velocity = 0.0
    panelOffset.velocity = 0.0
    dragStartTranslateY = barTranslateY.value
    dragStartPanelOffset = panelOffset.value
    barPressedScale.velocity = 0.0
    glowOpacitySpring.velocity = 0.0
    barPressedScaleTarget = BAR_PRESSED_SCALE
    glowOpacityTarget = 1.0
    isBarScaleSettling = false

    downX = localX
    downRawX = rawX
    movedDistance = 0.0
    pointerOriginX = localX.coerceIn(0.0, trackWidth)
    pointerLocalY = localY.coerceIn(0.0, trackHeight)

    ownsProgress = true
    if (tabWidth > 0.0) positionTarget = tabIndexAt(localX)
    dragStartTarget = positionTarget
    isDragging = true
    isReleasePending = false
    pressTarget = 1.0
    pillScaleTarget = PILL_PRESSED_SCALE
  }

  fun drag(translationX: Double, translationY: Double, rawX: Double) {
    if (tabWidth <= 0.0) return

    positionTarget = clampIndex(dragStartTarget + translationX / tabWidth)
    panelOffset.snapTo(dragStartPanelOffset + translationX)

    val verticalProgress = min(abs(translationY) / (MAX_DISTORTION_DISTANCE_DP * density), 1.0)
    barTranslateY.snapTo(dragStartTranslateY + rubberBand(translationY, trackHeight, VERTICAL_RUBBER_BAND) * VERTICAL_FOLLOW)
    barScaleX.snapTo(1.0 - verticalProgress * MAX_DISTORTION)
    pointerOriginX = (downX + rawX - downRawX).coerceIn(0.0, trackWidth)
    movedDistance = max(movedDistance, max(abs(translationX), abs(translationY)))
  }

  fun finish(): Int {
    isDragging = false
    panelOffset.velocity = 0.0
    barPressedScaleTarget = 1.0
    glowOpacityTarget = 0.0
    isBarScaleSettling = true

    val isTap = movedDistance < TAP_SLOP_DP * density && tabWidth > 0.0
    val nextIndex = if (isTap) tabIndexAt(downX) else clampIndex(positionTarget.roundToInt().toDouble())
    positionTarget = nextIndex
    isReleasePending = true
    return nextIndex.toInt()
  }

  fun step(rawDeltaSeconds: Double) {
    val deltaSeconds = min(rawDeltaSeconds, MAX_FRAME_DELTA_SECONDS)

    positionTarget = clampIndex(positionTarget)
    position.advance(positionTarget, deltaSeconds)

    val velocityTarget = if (isDragging && maxTabIndex > 0) position.velocity / maxTabIndex else 0.0
    filteredVelocity.advance(velocityTarget, deltaSeconds)

    if (!isDragging) panelOffset.advance(0.0, deltaSeconds)

    if (isReleasePending) {
      val releaseDistance = max(1, maxTabIndex) * RELEASE_DISTANCE_FRACTION
      if (abs(position.value - positionTarget) < releaseDistance) {
        isReleasePending = false
        pressTarget = 0.0
        pillScaleTarget = 1.0
      }
    }

    press.advance(pressTarget, deltaSeconds)
    pillScaleX.advance(pillScaleTarget, deltaSeconds)
    pillScaleY.advance(pillScaleTarget, deltaSeconds)
    advanceBar(deltaSeconds)
  }

  fun releaseProgressIfSettled() {
    val settled = !isDragging &&
      abs(position.value - positionTarget) < OWNERSHIP_REST &&
      abs(position.velocity) < OWNERSHIP_REST
    if (settled) ownsProgress = false
  }

  private fun advanceBar(deltaSeconds: Double) {
    advanceBarSpring(barPressedScale, barPressedScaleTarget, deltaSeconds)
    advanceBarSpring(glowOpacitySpring, glowOpacityTarget, deltaSeconds)
    if (isDragging) return

    advanceBarSpring(barTranslateY, 0.0, deltaSeconds)
    advanceBarSpring(barScaleX, 1.0, deltaSeconds)
    if (isBarScaleSettling && barScaleX.isAtRest(1.0)) {
      pointerOriginX = trackWidth / 2.0
      isBarScaleSettling = false
    }
  }

  private fun advanceBarSpring(spring: Spring, target: Double, deltaSeconds: Double) {
    if (reducedMotion) {
      spring.snapTo(target)
    } else {
      spring.advance(target, deltaSeconds)
    }
  }
}
