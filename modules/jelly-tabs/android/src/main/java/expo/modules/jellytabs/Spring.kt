package expo.modules.jellytabs

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.sin
import kotlin.math.sqrt

private const val REST_VELOCITY_RATIO = 16.0

internal class SpringSpec(private val stiffness: Double, private val dampingRatio: Double) {
  private val naturalFrequency = sqrt(stiffness)
  private val dampingFrequency = dampingRatio * naturalFrequency
  private val dampedFrequency = naturalFrequency * sqrt(1.0 - dampingRatio * dampingRatio)
  private val isCritical = dampingRatio == 1.0

  fun advance(spring: Spring, target: Double, deltaSeconds: Double) {
    val displacement = spring.value - target
    val velocity = spring.velocity

    if (isCritical) {
      val decay = exp(-naturalFrequency * deltaSeconds)
      val coefficient = velocity + naturalFrequency * displacement
      spring.value = target + (displacement + coefficient * deltaSeconds) * decay
      spring.velocity = (velocity - naturalFrequency * coefficient * deltaSeconds) * decay
      return
    }

    val decay = exp(-dampingFrequency * deltaSeconds)
    val angle = dampedFrequency * deltaSeconds
    val cosine = cos(angle)
    val sine = sin(angle)
    val positionCoefficient = (velocity + dampingFrequency * displacement) / dampedFrequency
    val velocityCoefficient = (dampingFrequency * velocity + stiffness * displacement) / dampedFrequency
    spring.value = target + decay * (displacement * cosine + positionCoefficient * sine)
    spring.velocity = decay * (velocity * cosine - velocityCoefficient * sine)
  }
}

internal class Spring(
  initialValue: Double,
  private val spec: SpringSpec,
  private val restThreshold: Double,
) {
  var value = initialValue
  var velocity = 0.0

  fun isAtRest(target: Double) =
    abs(value - target) < restThreshold && abs(velocity) < restThreshold * REST_VELOCITY_RATIO

  fun advance(target: Double, deltaSeconds: Double) {
    if (isAtRest(target)) {
      snapTo(target)
    } else {
      spec.advance(this, target, deltaSeconds)
    }
  }

  fun snapTo(target: Double) {
    value = target
    velocity = 0.0
  }
}
