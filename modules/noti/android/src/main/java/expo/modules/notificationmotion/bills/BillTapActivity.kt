package expo.modules.notificationmotion.bills

import android.app.Activity
import android.content.Intent
import android.os.Bundle

class BillTapActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val notifications = BillNotifications.get(this)
    notifications.rememberOpenedPeriod(intent.getStringExtra(BillNotifications.EXTRA_PERIOD))
    intent.getIntExtra(BillNotifications.EXTRA_ID, -1).takeIf { it >= 0 }?.let(notifications::cancel)
    packageManager.getLaunchIntentForPackage(packageName)?.let { startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    finish()
    overridePendingTransition(0, 0)
  }
}
