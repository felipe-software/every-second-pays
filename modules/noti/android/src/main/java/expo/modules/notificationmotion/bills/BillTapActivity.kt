package expo.modules.notificationmotion.bills

import android.app.Activity
import android.content.Intent
import android.os.Bundle

class BillTapActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    BillNotifications.get(this).rememberOpenedPeriod(intent.getStringExtra(BillNotifications.EXTRA_PERIOD))
    packageManager.getLaunchIntentForPackage(packageName)?.let { startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    finish()
    overridePendingTransition(0, 0)
  }
}
