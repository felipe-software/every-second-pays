package expo.modules.notificationmotion.bills

import android.app.Activity
import android.content.Intent
import android.os.Bundle

// A link can't carry this: when Android restores a killed app from Recents it brings back the old
// task without delivering the new intent. Android 12+ only allows this hop through an activity.
class BillTapActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    BillNotifications.get(this).rememberOpenedPeriod(intent.getStringExtra(BillNotifications.EXTRA_PERIOD))
    packageManager.getLaunchIntentForPackage(packageName)?.let { startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    finish()
    overridePendingTransition(0, 0)
  }
}
