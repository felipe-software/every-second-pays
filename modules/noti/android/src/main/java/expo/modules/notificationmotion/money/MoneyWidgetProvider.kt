package expo.modules.notificationmotion.money

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.concurrent.Executors

class MoneyWidgetProvider : AppWidgetProvider() {
  override fun onReceive(context: Context, intent: Intent) {
    if (Build.VERSION.SDK_INT < 31) return
    val widgets = MoneyWidgets.get(context)
    when (intent.action) {
      ACTION_SYNC -> async { widgets.publishAll() }
      ACTION_PINNED -> async {
        val widgetId = intent.widgetId()
        if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) widgets.pinned(widgetId, intent.getStringExtra(EXTRA_CONFIG))
      }
      AppWidgetManager.ACTION_APPWIDGET_UPDATE -> async {
        widgets.refresh(intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS) ?: intArrayOf())
      }
      AppWidgetManager.ACTION_APPWIDGET_OPTIONS_CHANGED -> async {
        val widgetId = intent.widgetId()
        if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) widgets.refresh(intArrayOf(widgetId))
      }
      AppWidgetManager.ACTION_APPWIDGET_DELETED -> async {
        val widgetId = intent.widgetId()
        if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) widgets.deleted(intArrayOf(widgetId))
      }
      AppWidgetManager.ACTION_APPWIDGET_RESTORED -> async {
        widgets.restored(
          intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_OLD_IDS) ?: intArrayOf(),
          intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS) ?: intArrayOf(),
        )
      }
      else -> super.onReceive(context, intent)
    }
  }

  private fun Intent.widgetId() =
    getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)

  private fun async(block: () -> Unit) {
    val pending = goAsync()
    executor.execute {
      try {
        block()
      } catch (error: Exception) {
        Log.e(TAG, "Unable to update the money widget", error)
      } finally {
        pending.finish()
      }
    }
  }

  companion object {
    const val ACTION_SYNC = "expo.modules.notificationmotion.money.SYNC"
    const val ACTION_PINNED = "expo.modules.notificationmotion.money.PINNED"
    const val EXTRA_CONFIG = "config"
    private const val TAG = "MoneyWidgetProvider"
    internal val executor = Executors.newSingleThreadExecutor()
  }
}
