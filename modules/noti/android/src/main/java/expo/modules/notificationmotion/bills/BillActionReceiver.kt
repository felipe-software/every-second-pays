package expo.modules.notificationmotion.bills

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import expo.modules.notificationmotion.NotificationMotionModule

class BillActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val kind = intent.getStringExtra(BillNotifications.EXTRA_KIND) ?: return
    val action = intent.getStringExtra(BillNotifications.EXTRA_ACTION) ?: return
    val notifications = BillNotifications.get(context)
    notifications.record(kind, intent.getStringExtra(BillNotifications.EXTRA_KEY).orEmpty(), action)
    notifications.cancel(intent.getIntExtra(BillNotifications.EXTRA_ID, 0))
    NotificationMotionModule.dispatchBillFeedback()
  }
}
