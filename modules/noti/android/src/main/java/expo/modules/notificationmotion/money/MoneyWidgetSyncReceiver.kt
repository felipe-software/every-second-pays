package expo.modules.notificationmotion.money

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/** The wall clock moved: every timeline is sampled at the wrong instants now. */
class MoneyWidgetSyncReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (Build.VERSION.SDK_INT < 31) return
    val pending = goAsync()
    MoneyWidgetProvider.executor.execute {
      try {
        MoneyWidgets.get(context).publishAll()
      } catch (error: Exception) {
        Log.e("MoneyWidgetSync", "Unable to re-sync money widgets", error)
      } finally {
        pending.finish()
      }
    }
  }
}
