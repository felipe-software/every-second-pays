package expo.modules.notificationmotion.money

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/**
 * The launcher's "Customize" action. Accepts right away (configuration is optional, so the
 * widget is already showing) and opens the app's widget editor on that widget.
 */
class MoneyWidgetConfigureActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val widgetId = intent?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
      ?: AppWidgetManager.INVALID_APPWIDGET_ID
    setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
    val scheme = packageManager.getApplicationInfo(packageName, android.content.pm.PackageManager.GET_META_DATA)
      .metaData?.getString(SCHEME_META_DATA)
    val editor = scheme?.let {
      Intent(Intent.ACTION_VIEW, Uri.parse("$it://settings/widgets?widget=$widgetId")).setPackage(packageName)
    }
    val launch = editor?.takeIf { it.resolveActivity(packageManager) != null }
      ?: packageManager.getLaunchIntentForPackage(packageName)
    launch?.let { startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    finish()
  }

  companion object {
    /** Set by the config plugin from the app's URL scheme. */
    const val SCHEME_META_DATA = "expo.modules.notificationmotion.SCHEME"
  }
}
