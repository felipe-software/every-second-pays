package expo.modules.predictiveback

import android.graphics.Rect
import android.view.View
import android.view.ViewGroup
import androidx.activity.BackEventCompat
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.coordinatorlayout.widget.CoordinatorLayout
import com.facebook.react.ReactActivity
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.swmansion.rnscreens.ScreenStack

// BackEvent.EDGE_NONE, sent by 3-button navigation on API 36; the androidx version in use has no constant for it.
private const val EDGE_NONE = 2

internal class BackRouter(
  val activity: ComponentActivity,
  private val onProgress: (Float) -> Unit,
  private val onCancel: () -> Unit,
) {
  private val reactCallback = findReactBackCallback(activity)
  private var animation: BackAnimation? = null
  private var lastStackAnimation: StackBackAnimation? = null
  private var systemBackAllowed = false

  private val callback = object : OnBackPressedCallback(true) {
    override fun handleOnBackStarted(backEvent: BackEventCompat) {
      animation = createAnimation(backEvent)
    }

    override fun handleOnBackProgressed(backEvent: BackEventCompat) {
      animation?.update(backEvent)
    }

    override fun handleOnBackCancelled() {
      animation?.cancel()
      animation = null
    }

    override fun handleOnBackPressed() {
      val finishing = animation
      animation = null
      if (finishing == null) forwardToReact() else finishing.finish(::forwardToReact)
    }
  }

  init {
    activity.onBackPressedDispatcher.addCallback(activity, callback)
  }

  fun release() {
    callback.remove()
  }

  // The system only plays its back-to-home animation while no callback is enabled, including React Native's.
  fun setSystemBackAllowed(allowed: Boolean) {
    systemBackAllowed = allowed && reactCallback != null
    callback.isEnabled = !systemBackAllowed
    reactCallback?.isEnabled = !systemBackAllowed
  }

  private fun forwardToReact() {
    callback.isEnabled = false
    activity.onBackPressedDispatcher.onBackPressed()
    callback.isEnabled = !systemBackAllowed
  }

  private fun createAnimation(event: BackEventCompat): BackAnimation? {
    if (event.swipeEdge == EDGE_NONE) return null
    val root = activity.window.decorView
    findTopSheet(root)?.let { sheet ->
      return if (sheet.isHideable) SheetBackAnimation(sheet, event) else null
    }
    lastStackAnimation?.let { previous ->
      previous.endCancel()
      if (previous.isAwaitingPop()) return null
    }
    findVisibleStack(root)?.let { stack ->
      return StackBackAnimation.create(stack, event)?.also { lastStackAnimation = it }
    }
    return ProgressEventsAnimation(event, onProgress, onCancel)
  }
}

private fun findReactBackCallback(activity: ComponentActivity): OnBackPressedCallback? =
  runCatching {
    // Looked up by type because the field is private and R8 renames it in release builds.
    ReactActivity::class.java.declaredFields
      .first { OnBackPressedCallback::class.java.isAssignableFrom(it.type) }
      .apply { isAccessible = true }
      .get(activity) as OnBackPressedCallback
  }.getOrNull()

private fun findTopSheet(view: View): BottomSheetBehavior<*>? {
  if (view.visibility != View.VISIBLE) return null
  val behavior = (view.layoutParams as? CoordinatorLayout.LayoutParams)?.behavior as? BottomSheetBehavior<*>
  if (behavior != null && behavior.state != BottomSheetBehavior.STATE_HIDDEN) return behavior
  if (view !is ViewGroup) return null
  for (index in view.childCount - 1 downTo 0) {
    findTopSheet(view.getChildAt(index))?.let { return it }
  }
  return null
}

private fun findVisibleStack(view: View): ScreenStack? {
  if (view.visibility != View.VISIBLE) return null
  if (view is ViewGroup) {
    for (index in view.childCount - 1 downTo 0) {
      findVisibleStack(view.getChildAt(index))?.let { return it }
    }
  }
  // An inactive tab keeps its pushed pages mounted, just translated off screen.
  return (view as? ScreenStack)?.takeIf { it.topIndex() > 0 && it.getGlobalVisibleRect(Rect()) }
}
