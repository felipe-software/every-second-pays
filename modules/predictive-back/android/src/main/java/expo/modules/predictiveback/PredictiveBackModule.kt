package expo.modules.predictiveback

import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.activity.ComponentActivity
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val PROGRESS_EVENT = "onProgress"
private const val CANCEL_EVENT = "onCancel"

class PredictiveBackModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var router: BackRouter? = null
  private var systemBackAllowed = false

  override fun definition() = ModuleDefinition {
    Name("PredictiveBack")

    Events(PROGRESS_EVENT, CANCEL_EVENT)

    Function("setSystemBackAllowed") { allowed: Boolean ->
      systemBackAllowed = allowed
      mainHandler.post(::syncRouter)
    }

    OnCreate { mainHandler.post(::syncRouter) }

    OnActivityEntersForeground { mainHandler.post(::syncRouter) }

    OnDestroy {
      mainHandler.post {
        router?.release()
        router = null
      }
    }
  }

  private fun syncRouter() {
    // Older versions never report gesture progress, so they keep React Native's own back handling.
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return
    val activity = appContext.currentActivity as? ComponentActivity ?: return
    val current = router?.takeIf { it.activity === activity } ?: createRouter(activity)
    current.setSystemBackAllowed(systemBackAllowed)
  }

  private fun createRouter(activity: ComponentActivity): BackRouter {
    router?.release()
    return BackRouter(
      activity = activity,
      onProgress = { progress -> sendEvent(PROGRESS_EVENT, mapOf("progress" to progress)) },
      onCancel = { sendEvent(CANCEL_EVENT, emptyMap<String, Any?>()) },
    ).also { router = it }
  }
}
