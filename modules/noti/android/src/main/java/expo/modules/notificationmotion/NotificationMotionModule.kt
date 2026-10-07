package expo.modules.notificationmotion

import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.notificationmotion.money.MoneyWidgetPreviewView
import expo.modules.notificationmotion.money.MoneyWidgets

class NotificationIdentity : Record {
  @Field val id: Int = 0
  @Field val tag: String? = null
}

class NotificationMotionModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext).applicationContext
  private val store get() = MotionNotifications.get(context)
  private val widgets get() = MotionWidgets.get(context)
  private val money get() = MoneyWidgets.get(context)

  private fun supported() {
    check(Build.VERSION.SDK_INT >= 31) { "Noti requires Android 12 / API 31 or newer." }
  }

  override fun definition() = ModuleDefinition {
    Name("NotificationMotion")
    Events("onAction", "onWidgetAction", "onWidgetPinned", "onMoneyWidgetsChanged")
    AsyncFunction("create") { options: String -> supported(); store.create(options) }
    AsyncFunction("update") { identity: NotificationIdentity, update: String -> supported(); store.update(identity, update) }
    AsyncFunction("adopt") { identity: NotificationIdentity -> supported(); store.adopt(identity) }
    AsyncFunction("listActive") { supported(); store.listActive() }
    AsyncFunction("dismiss") { identity: NotificationIdentity -> supported(); store.dismiss(identity) }
    AsyncFunction("scrollTo") { identity: NotificationIdentity, nodeId: String, index: Int -> supported(); store.scrollTo(identity, nodeId, index) }
    AsyncFunction("isWidgetPinningSupported") { Build.VERSION.SDK_INT >= 31 && widgets.isPinningSupported() }
    AsyncFunction("requestPinWidget") { scene: String -> supported(); widgets.requestPin(scene) }
    AsyncFunction("listWidgets") { supported(); widgets.list() }
    AsyncFunction("updateWidget") { widgetId: Int, scene: String -> supported(); widgets.update(widgetId, scene) }
    AsyncFunction("updateAllWidgets") { scene: String -> supported(); widgets.updateAll(scene) }

    // Live money widget: native timeline rendering, driven by a schedule the app publishes.
    AsyncFunction("isMoneyWidgetSupported") { Build.VERSION.SDK_INT >= 31 && money.isInstalled() }
    AsyncFunction("isMoneyWidgetPinningSupported") { Build.VERSION.SDK_INT >= 31 && money.isPinningSupported() }
    AsyncFunction("setMoneyWidgetData") { data: String -> supported(); money.setData(data) }
    AsyncFunction("setMoneyWidgetDefaultConfig") { config: String -> supported(); money.setDefaultConfig(config) }
    AsyncFunction("requestPinMoneyWidget") { config: String -> supported(); money.requestPin(config) }
    AsyncFunction("listMoneyWidgets") { supported(); money.list() }
    AsyncFunction("updateMoneyWidget") { widgetId: Int, config: String -> supported(); money.update(widgetId, config) }

    View(MoneyWidgetPreviewView::class) {
      Prop("config") { view: MoneyWidgetPreviewView, config: String -> view.setConfig(config) }
      Prop("revision") { view: MoneyWidgetPreviewView, revision: Int -> view.setRevision(revision) }
    }

    OnCreate { active = this@NotificationMotionModule }
    OnDestroy { if (active === this@NotificationMotionModule) active = null }
  }

  companion object {
    @Volatile private var active: NotificationMotionModule? = null
    fun dispatch(id: Int, tag: String?, nodeId: String, action: String) {
      active?.sendEvent("onAction", mapOf("id" to id, "tag" to tag, "nodeId" to nodeId, "action" to action))
    }
    fun dispatchWidget(widgetId: Int, nodeId: String, action: String) {
      active?.sendEvent("onWidgetAction", mapOf("widgetId" to widgetId, "nodeId" to nodeId, "action" to action))
    }
    fun dispatchWidgetPinned(widgetId: Int) {
      active?.sendEvent("onWidgetPinned", mapOf("widgetId" to widgetId))
    }
    fun dispatchMoneyWidgetsChanged() {
      active?.sendEvent("onMoneyWidgetsChanged", emptyMap<String, Any>())
    }
  }
}
