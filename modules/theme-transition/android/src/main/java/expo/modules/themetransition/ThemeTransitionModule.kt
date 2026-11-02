package expo.modules.themetransition

import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

private const val BEGIN_TIMEOUT_MS = 250L

class ThemeTransitionModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val controller = RevealController { appContext.currentActivity }

  override fun definition() = ModuleDefinition {
    Name("ThemeTransition")

    Function("begin") { frameKey: String? -> begin(frameKey) }

    Function("commit") { originX: Double, originY: Double, durationMs: Int, settleFrames: Int ->
      mainHandler.post { controller.commit(originX, originY, durationMs, settleFrames) }
      Unit
    }

    Function("flip") { from: String, to: String, originX: Double, originY: Double, durationMs: Int ->
      if (!controller.hasFrames(from, to)) return@Function false
      mainHandler.post { controller.flip(from, to, originX, originY, durationMs) }
      true
    }

    Function("endBurst") { settleFrames: Int, fadeMs: Int ->
      mainHandler.post { controller.endBurst(settleFrames, fadeMs) }
      Unit
    }

    Function("clearFrames") {
      mainHandler.post { controller.clearFrames() }
      Unit
    }

    OnActivityEntersBackground { mainHandler.post { controller.removeAll() } }

    OnDestroy { mainHandler.post { controller.removeAll() } }
  }

  // The capture has a side effect, so whichever side loses the race to decide has to clean up after itself.
  private fun begin(frameKey: String?): Boolean {
    if (Looper.myLooper() == Looper.getMainLooper()) return controller.begin(frameKey)

    val decided = AtomicBoolean(false)
    val latch = CountDownLatch(1)
    var captured = false

    mainHandler.post {
      val ok = controller.begin(frameKey)
      if (decided.compareAndSet(false, true)) captured = ok else if (ok) controller.dropPending()
      latch.countDown()
    }

    if (latch.await(BEGIN_TIMEOUT_MS, TimeUnit.MILLISECONDS)) return captured
    if (decided.compareAndSet(false, true)) return false
    latch.await()
    return captured
  }
}
