package expo.modules.notificationmotion.bills

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.provider.Settings
import kotlinx.coroutines.delay
import org.json.JSONArray
import org.json.JSONObject

internal class BillNotifications private constructor(private val context: Context) {
  private val manager = context.getSystemService(NotificationManager::class.java)
  private val feedback = context.getSharedPreferences(FEEDBACK_STORE, Context.MODE_PRIVATE)

  fun areEnabled() = manager.areNotificationsEnabled()

  fun channelEnabled(id: String) = manager.areNotificationsEnabled() &&
    manager.getNotificationChannel(id)?.importance != NotificationManager.IMPORTANCE_NONE

  fun openSettings() {
    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
      .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  // Silent, but high importance: only high-importance notifications pop up on arrival, and the pop-up
  // is what plays the animation in front of the user.
  fun ensureChannels(serialized: String) {
    val channels = JSONArray(serialized)
    for (index in 0 until channels.length()) {
      val channel = channels.getJSONObject(index)
      val existing = manager.getNotificationChannel(channel.getString("id"))
      val next = existing ?: NotificationChannel(channel.getString("id"), channel.getString("name"), NotificationManager.IMPORTANCE_HIGH).apply {
        setSound(null, null)
        enableVibration(false)
        setShowBadge(false)
      }
      next.name = channel.getString("name")
      next.description = channel.optString("description")
      manager.createNotificationChannel(next)
    }
  }

  suspend fun post(serialized: String): Boolean {
    val payload = JSONObject(serialized)
    val channelId = payload.getString("channel")
    if (!channelEnabled(channelId)) return false
    val kind = payload.getString("kind")
    val id = NOTIFICATION_IDS[kind] ?: NOTIFICATION_IDS.getValue("progress")
    // Android 12 drops a new row's view animations but not an update's, so the row is created quietly first.
    if (Build.VERSION.SDK_INT >= 31 && Build.VERSION.SDK_INT <= LAST_SDK_FREEZING_NEW_ROWS && !isShowing(id)) {
      val quiet = plainBuilder(payload, channelId, id, kind).setGroup(QUIET_GROUP).setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
      manager.notify(TAG, id, quiet.build())
      delay(ROW_SETTLE_MS)
      if (!isShowing(id)) return true
    }
    val builder = plainBuilder(payload, channelId, id, kind)
    if (Build.VERSION.SDK_INT >= 31) {
      val spec = BillSpec(payload)
      val renderer = MarkedBarRenderer(context)
      builder.setStyle(Notification.DecoratedCustomViewStyle())
      builder.setCustomContentView(renderer.render(spec, MarkedBarRenderer.COLLAPSED))
      builder.setCustomHeadsUpContentView(renderer.render(spec, MarkedBarRenderer.POPUP))
      builder.setCustomBigContentView(renderer.render(spec, MarkedBarRenderer.EXPANDED))
    }
    manager.notify(TAG, id, builder.build())
    return true
  }

  private fun isShowing(id: Int) = manager.activeNotifications.any { it.id == id && it.tag == TAG }

  private fun plainBuilder(payload: JSONObject, channelId: String, id: Int, kind: String): Notification.Builder {
    val icon = context.resources.getIdentifier("nm_small_icon", "drawable", context.packageName)
    val accent = Color.parseColor(payload.getJSONObject("colors").getJSONArray("accent").getString(0))
    val hidden = !payload.has("amount") || payload.isNull("amount")
    val builder = Notification.Builder(context, channelId)
      .setSmallIcon(icon)
      .setColor(accent)
      .setContentTitle(payload.getString("title"))
      .setContentText(payload.getString("body"))
      .setAutoCancel(true)
      .setShowWhen(true)
      .setCategory(Notification.CATEGORY_RECOMMENDATION)
      .setVisibility(if (hidden) Notification.VISIBILITY_PUBLIC else Notification.VISIBILITY_PRIVATE)
      .setContentIntent(openIntent(id, payload.optString("period")))
    if (!hidden) {
      builder.setPublicVersion(
        Notification.Builder(context, channelId)
          .setSmallIcon(icon)
          .setColor(accent)
          .setContentTitle(payload.getString("publicTitle"))
          .setContentText(payload.getString("publicBody"))
          .build(),
      )
    }
    val actions = payload.getJSONObject("actions")
    builder.addAction(action(id, kind, payload.getString("key"), ACTION_LESS, actions.getString("less")))
    builder.addAction(action(id, kind, payload.getString("key"), ACTION_NICE, actions.getString("nice")))
    return builder
  }

  private fun openIntent(id: Int, period: String): PendingIntent {
    val intent = Intent(context, BillTapActivity::class.java).putExtra(EXTRA_PERIOD, period)
    return PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun action(id: Int, kind: String, key: String, action: String, title: String): Notification.Action {
    val intent = Intent(context, BillActionReceiver::class.java)
      .setData(Uri.Builder().scheme("earnings-bill").authority(context.packageName).appendPath(id.toString()).appendPath(action).build())
      .putExtra(EXTRA_ID, id)
      .putExtra(EXTRA_KIND, kind)
      .putExtra(EXTRA_KEY, key)
      .putExtra(EXTRA_ACTION, action)
    val pending = PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    return Notification.Action.Builder(null as Icon?, title, pending).build()
  }

  // The app may not be running when a button is tapped, so taps wait here until JS next runs.
  @Synchronized fun record(kind: String, key: String, action: String) {
    val pending = runCatching { JSONArray(feedback.getString(FEEDBACK_KEY, "[]")) }.getOrElse { JSONArray() }
    pending.put(JSONObject().put("kind", kind).put("key", key).put("action", action).put("at", System.currentTimeMillis()))
    feedback.edit().putString(FEEDBACK_KEY, pending.toString()).commit()
  }

  @Synchronized fun drain(): String {
    val pending = feedback.getString(FEEDBACK_KEY, "[]") ?: "[]"
    feedback.edit().remove(FEEDBACK_KEY).commit()
    return pending
  }

  fun cancel(id: Int) = manager.cancel(TAG, id)

  fun rememberOpenedPeriod(period: String?) {
    feedback.edit().putString(OPENED_KEY, period.orEmpty()).commit()
  }

  fun takeOpenedPeriod(): String? {
    val period = feedback.getString(OPENED_KEY, null)
    feedback.edit().remove(OPENED_KEY).commit()
    return period?.takeIf { it.isNotEmpty() }
  }

  companion object {
    const val EXTRA_ID = "billId"
    const val EXTRA_KIND = "billKind"
    const val EXTRA_KEY = "billKey"
    const val EXTRA_ACTION = "billAction"
    const val EXTRA_PERIOD = "billPeriod"
    private const val ACTION_LESS = "less"
    private const val ACTION_NICE = "nice"
    private const val TAG = "earnings-bill"
    private const val FEEDBACK_STORE = "earnings-bill-feedback"
    private const val FEEDBACK_KEY = "pending"
    private const val OPENED_KEY = "opened-period"
    private const val LAST_SDK_FREEZING_NEW_ROWS = 32
    private const val ROW_SETTLE_MS = 1_000L
    private const val QUIET_GROUP = "earnings-bill-quiet"
    private val NOTIFICATION_IDS = mapOf("week" to 72_001, "progress" to 72_002, "year" to 72_003, "meter" to 72_004)

    @Volatile private var instance: BillNotifications? = null
    fun get(context: Context): BillNotifications = instance ?: synchronized(this) {
      instance ?: BillNotifications(context.applicationContext).also { instance = it }
    }
  }
}
