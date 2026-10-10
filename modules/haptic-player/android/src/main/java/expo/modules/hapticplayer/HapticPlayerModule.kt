package expo.modules.hapticplayer

import android.media.AudioAttributes
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.VibrationEffect.Composition
import android.os.Vibrator
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

private val PRIMITIVES = mapOf(
  "click" to Composition.PRIMITIVE_CLICK,
  "tick" to Composition.PRIMITIVE_TICK,
  "lowTick" to Composition.PRIMITIVE_LOW_TICK,
  "thud" to Composition.PRIMITIVE_THUD,
  "spin" to Composition.PRIMITIVE_SPIN,
  "quickRise" to Composition.PRIMITIVE_QUICK_RISE,
  "slowRise" to Composition.PRIMITIVE_SLOW_RISE,
  "quickFall" to Composition.PRIMITIVE_QUICK_FALL,
)

class Chunk : Record {
  @Field val at: Int = 0
  @Field val primitives: List<String> = emptyList()
  @Field val scales: List<Double> = emptyList()
  @Field val delays: List<Int> = emptyList()
}

class HapticPlayerModule : Module() {
  private val vibrator: Vibrator?
    get() = appContext.reactContext?.getSystemService(Vibrator::class.java)

  private var thread: HandlerThread? = null

  // Its own thread, so a busy UI thread can't delay a chunk past the moment it belongs to.
  private val handler: Handler by lazy {
    Handler(HandlerThread("HapticPlayer").also { it.start(); thread = it }.looper)
  }

  private val scheduled = Any()

  private fun vibrate(vibrator: Vibrator, effect: VibrationEffect) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_MEDIA))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(effect, AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).build())
    }
  }

  override fun definition() = ModuleDefinition {
    Name("HapticPlayer")

    Function("hasAmplitudeControl") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        vibrator?.let { it.hasVibrator() && it.hasAmplitudeControl() } ?: false
    }

    Function("playWaveform") { timings: IntArray, amplitudes: IntArray ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function
      val vibrator = vibrator ?: return@Function
      vibrate(vibrator, VibrationEffect.createWaveform(LongArray(timings.size) { timings[it].toLong() }, amplitudes, -1))
    }

    Function("primitiveDurations") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function null
      val vibrator = vibrator?.takeIf { it.hasVibrator() } ?: return@Function null
      PRIMITIVES.keys.zip(vibrator.getPrimitiveDurations(*PRIMITIVES.values.toIntArray()).toList()).toMap()
    }

    Function("playScore") { chunks: List<Chunk> ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function
      val vibrator = vibrator ?: return@Function
      handler.removeCallbacksAndMessages(scheduled)
      val start = SystemClock.uptimeMillis()
      for (chunk in chunks) {
        val composition = VibrationEffect.startComposition()
        chunk.primitives.forEachIndexed { index, primitive ->
          composition.addPrimitive(PRIMITIVES.getValue(primitive), chunk.scales[index].toFloat(), chunk.delays[index])
        }
        val effect = composition.compose()
        handler.postAtTime({ vibrate(vibrator, effect) }, scheduled, start + chunk.at)
      }
    }

    Function("stop") {
      thread?.let { handler.removeCallbacksAndMessages(scheduled) }
      vibrator?.cancel()
    }

    OnDestroy {
      thread?.quitSafely()
    }
  }
}
