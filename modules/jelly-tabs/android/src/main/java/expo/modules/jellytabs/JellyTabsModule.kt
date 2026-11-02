package expo.modules.jellytabs

import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.jni.worklets.Worklet
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class JellyTabsModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("JellyTabs")

    Class("JellyTabBarController", JellyTabBarController::class) {
      Constructor { JellyTabBarController() }

      Property("isJellyTabBarController") { _: JellyTabBarController -> true }

      // Runs on the UI worklet runtime, which is Android's main thread.
      Function("setProgress") { controller: JellyTabBarController, progress: Double ->
        controller.followProgress(progress)
      }

      Function("setProgressListener") { controller: JellyTabBarController, listener: Worklet ->
        mainHandler.post { controller.setProgressListener(listener) }
      }

      Function("activateTab") { controller: JellyTabBarController, index: Int ->
        mainHandler.post { controller.activateTab(index) }
      }
    }

    View(JellyTabBarView::class) {
      Events("onTabPress")

      Prop("controller") { view: JellyTabBarView, controller: JellyTabBarController ->
        view.setController(controller)
      }
      Prop("labels") { view: JellyTabBarView, labels: List<String> -> view.setLabels(labels) }
      Prop("iconPaths") { view: JellyTabBarView, paths: List<String> -> view.setIconPaths(paths) }
      Prop("selectedIndex") { view: JellyTabBarView, index: Int -> view.setSelectedIndex(index) }
      Prop("surfaceColor") { view: JellyTabBarView, color: Int -> view.setSurfaceColor(color) }
      Prop("outlineColor") { view: JellyTabBarView, color: Int -> view.setOutlineColor(color) }
      Prop("accentColor") { view: JellyTabBarView, color: Int -> view.setAccentColor(color) }
      Prop("activeContentColor") { view: JellyTabBarView, color: Int -> view.setActiveContentColor(color) }
      Prop("inactiveContentColor") { view: JellyTabBarView, color: Int -> view.setInactiveContentColor(color) }

      OnViewDidUpdateProps { view: JellyTabBarView -> view.commitTabs() }

      OnViewDestroys { view: JellyTabBarView -> view.release() }
    }
  }
}
