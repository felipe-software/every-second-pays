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
import android.widget.RemoteViews
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
    val kind = payload.getString("kind")
    val id = NOTIFICATION_IDS[kind] ?: NOTIFICATION_IDS.getValue("progress")
    return deliver(channelId, id, { plainBuilder(payload, channelId, id, kind) }) {
      val spec = BillSpec(payload)
      val renderer = MarkedBarRenderer(context)
      CardViews(
        renderer.render(spec, MarkedBarRenderer.COLLAPSED),
        renderer.render(spec, MarkedBarRenderer.POPUP),
        renderer.render(spec, MarkedBarRenderer.EXPANDED),
      )
    }
  }

  suspend fun postReminder(serialized: String): Boolean {
    val payload = JSONObject(serialized)
    val channelId = payload.getString("channel")
    val id = NOTIFICATION_IDS.getValue(payload.getString("kind"))
    val plain = {
      val open = Notification.Action.Builder(null as Icon?, payload.getString("action"), openIntent(id, payload.optString("period"))).build()
      textBuilder(payload, channelId, id)
        .setStyle(Notification.BigTextStyle().bigText(payload.getString("body")))
        .addAction(open)
    }
    return deliver(channelId, id, plain) {
      val spec = TumbleweedSpec(payload)
      val renderer = TumbleweedRenderer(context)
      CardViews(
        renderer.render(spec, TumbleweedRenderer.COLLAPSED),
        renderer.render(spec, TumbleweedRenderer.POPUP),
        renderer.render(spec, TumbleweedRenderer.EXPANDED),
      )
    }
  }

  private suspend fun deliver(
    channelId: String,
    id: Int,
    plain: () -> Notification.Builder,
    card: () -> CardViews,
  ): Boolean {
    if (!channelEnabled(channelId)) return false
    if (Build.VERSION.SDK_INT >= 31 && Build.VERSION.SDK_INT <= LAST_SDK_FREEZING_NEW_ROWS && !isShowing(id)) {
      val quiet = plain().setGroup(QUIET_GROUP).setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY)
      manager.notify(TAG, id, quiet.build())
      delay(ROW_SETTLE_MS)
      if (!isShowing(id)) return true
    }
    val builder = plain()
    if (Build.VERSION.SDK_INT >= 31) {
      val views = card()
      builder.setStyle(Notification.DecoratedCustomViewStyle())
      builder.setCustomContentView(views.collapsed)
      builder.setCustomHeadsUpContentView(views.popup)
      builder.setCustomBigContentView(views.expanded)
    }
    manager.notify(TAG, id, builder.build())
    return true
  }

  private class CardViews(val collapsed: RemoteViews, val popup: RemoteViews, val expanded: RemoteViews)

  private fun isShowing(id: Int) = manager.activeNotifications.any { it.id == id && it.tag == TAG }

  private fun plainBuilder(payload: JSONObject, channelId: String, id: Int, kind: String): Notification.Builder {
    val actions = payload.getJSONObject("actions")
    return textBuilder(payload, channelId, id)
      .addAction(action(id, kind, payload.getString("key"), ACTION_LESS, actions.getString("less")))
      .addAction(action(id, kind, payload.getString("key"), ACTION_NICE, actions.getString("nice")))
  }

  private fun textBuilder(payload: JSONObject, channelId: String, id: Int): Notification.Builder {
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
    return builder
  }

  private fun openIntent(id: Int, period: String): PendingIntent {
    val intent = Intent(context, BillTapActivity::class.java).putExtra(EXTRA_PERIOD, period).putExtra(EXTRA_ID, id)
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
    private val NOTIFICATION_IDS = mapOf("week" to 72_001, "progress" to 72_002, "year" to 72_003, "meter" to 72_004, "setup" to 72_005)

    @Volatile private var instance: BillNotifications? = null
    fun get(context: Context): BillNotifications = instance ?: synchronized(this) {
      instance ?: BillNotifications(context.applicationContext).also { instance = it }
    }
  }
}
