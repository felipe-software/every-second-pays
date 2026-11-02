package expo.modules.jellytabs

import expo.modules.kotlin.jni.worklets.Worklet
import expo.modules.kotlin.sharedobjects.SharedObject

class JellyTabBarController : SharedObject() {
  private var view: JellyTabBarView? = null
  private var progressListener: Worklet? = null
  private var latestProgress = Double.NaN

  internal fun attach(nextView: JellyTabBarView) {
    view = nextView
    if (!latestProgress.isNaN()) nextView.followProgress(latestProgress)
  }

  internal fun detach(previousView: JellyTabBarView) {
    if (view === previousView) view = null
  }

  internal fun setProgressListener(listener: Worklet) {
    progressListener = listener
  }

  internal fun followProgress(progress: Double) {
    latestProgress = progress
    view?.followProgress(progress)
  }

  internal fun activateTab(index: Int) {
    view?.activateTab(index)
  }

  internal fun publishProgress(progress: Double) {
    if (progress == latestProgress) return
    val listener = progressListener ?: return
    val runtime = appContext?.uiRuntime ?: return
    latestProgress = progress
    listener.execute(runtime, progress)
  }
}
