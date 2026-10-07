package expo.modules.notificationmotion.money

import android.annotation.TargetApi
import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.util.SizeF
import expo.modules.notificationmotion.NotificationMotionModule
import org.json.JSONArray
import org.json.JSONObject

/**
 * Owns the live money widgets: their configs, the data the app last published, and the
 * re-sync clock. The launcher animates each widget from a timeline of frames; this class
 * replaces that timeline before it runs out.
 *
 * Re-syncs use a non-wakeup alarm. While the screen is on it fires about on time; while the
 * device sleeps it waits, then fires as soon as the device wakes, which is exactly when a
 * stale timeline would first be seen again.
 */
@TargetApi(31)
class MoneyWidgets private constructor(private val context: Context) {
  private val manager = AppWidgetManager.getInstance(context)
  private val component = ComponentName(context, MoneyWidgetProvider::class.java)
  private val preferences = context.getSharedPreferences("noti-money-widgets", Context.MODE_PRIVATE)
  private val renderer by lazy { MoneyWidgetRenderer(context) }

  fun isInstalled(): Boolean = manager.installedProviders.any { it.provider == component }

  fun isPinningSupported(): Boolean = isInstalled() && manager.isRequestPinAppWidgetSupported

  // -------------------------------------------------------------------------------------------
  // App-facing API.

  @Synchronized fun setData(serialized: String) {
    JSONObject(serialized)
    preferences.edit().putString(DATA, serialized).apply()
    publishAll()
  }

  @Synchronized fun setDefaultConfig(serialized: String) {
    preferences.edit().putString(DEFAULT_CONFIG, MoneyConfig.parse(serialized).toJson()).apply()
  }

  @Synchronized fun requestPin(serialized: String): Boolean {
    check(isInstalled()) { "The live money widget isn't available on this device." }
    if (!manager.isRequestPinAppWidgetSupported) return false
    val config = MoneyConfig.parse(serialized)
    val preview = renderer.render(config, data(), PIN_PREVIEW_SIZE, System.currentTimeMillis(), null, null, null, null, maxFrames = 30)
    val extras = Bundle().apply { putParcelable(AppWidgetManager.EXTRA_APPWIDGET_PREVIEW, preview.views) }
    // Each request carries its own config; the launcher adds the new widget id when it calls back.
    val nonce = System.currentTimeMillis()
    val callback = Intent(context, MoneyWidgetProvider::class.java)
      .setAction(MoneyWidgetProvider.ACTION_PINNED)
      .setData(android.net.Uri.parse("noti-money-widget://${context.packageName}/pinned/$nonce"))
      .putExtra(MoneyWidgetProvider.EXTRA_CONFIG, config.toJson())
    val success = PendingIntent.getBroadcast(
      context,
      0,
      callback,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
    )
    return manager.requestPinAppWidget(component, extras, success)
  }

  @Synchronized fun list(): List<Map<String, Any>> = ids().map { id ->
    val size = size(id)
    mapOf(
      "id" to id,
      "config" to config(id).toJson(),
      "width" to size.width.toDouble(),
      "height" to size.height.toDouble(),
    )
  }

  @Synchronized fun update(widgetId: Int, serialized: String) {
    require(widgetId in ids()) { "Unknown widget id $widgetId." }
    preferences.edit().putString(configKey(widgetId), MoneyConfig.parse(serialized).toJson()).apply()
    publish(widgetId, System.currentTimeMillis())
    scheduleSync()
  }

  // -------------------------------------------------------------------------------------------
  // Provider callbacks.

  @Synchronized fun pinned(widgetId: Int, serializedConfig: String?) {
    serializedConfig?.let {
      preferences.edit().putString(configKey(widgetId), MoneyConfig.parse(it).toJson()).apply()
    }
    forgetPublished(widgetId)
    publish(widgetId, System.currentTimeMillis())
    scheduleSync()
    NotificationMotionModule.dispatchMoneyWidgetsChanged()
  }

  /** Re-renders `widgetIds` from scratch: the launcher may have lost the cached views. */
  @Synchronized fun refresh(widgetIds: IntArray) {
    val now = System.currentTimeMillis()
    widgetIds.forEach { id ->
      forgetPublished(id)
      publish(id, now)
    }
    scheduleSync()
    NotificationMotionModule.dispatchMoneyWidgetsChanged()
  }

  @Synchronized fun publishAll() {
    val now = System.currentTimeMillis()
    ids().forEach { publish(it, now) }
    scheduleSync()
  }

  @Synchronized fun deleted(widgetIds: IntArray) {
    preferences.edit().also { editor ->
      widgetIds.forEach { id -> keys(id).forEach(editor::remove) }
    }.apply()
    scheduleSync()
    NotificationMotionModule.dispatchMoneyWidgetsChanged()
  }

  @Synchronized fun restored(oldIds: IntArray, newIds: IntArray) {
    val editor = preferences.edit()
    oldIds.zip(newIds).forEach { (old, new) ->
      preferences.getString(configKey(old), null)?.let { editor.putString(configKey(new), it) }
      keys(old).forEach(editor::remove)
    }
    editor.apply()
    refresh(newIds)
  }

  // -------------------------------------------------------------------------------------------
  // Rendering.

  internal fun data(): MoneyData = MoneyData.parse(preferences.getString(DATA, null))

  internal fun config(widgetId: Int): MoneyConfig =
    MoneyConfig.parse(preferences.getString(configKey(widgetId), null) ?: preferences.getString(DEFAULT_CONFIG, null))

  private fun ids(): List<Int> = if (isInstalled()) manager.getAppWidgetIds(component).toList() else emptyList()

  private fun size(widgetId: Int): MoneyWidgetRenderer.Size {
    val options = manager.getAppWidgetOptions(widgetId)
    @Suppress("DEPRECATION")
    val sizes = options.getParcelableArrayList<SizeF>(AppWidgetManager.OPTION_APPWIDGET_SIZES)
    // Portrait size: the launcher's first entry, or min width × max height.
    sizes?.firstOrNull()?.let { return MoneyWidgetRenderer.Size(it.width, it.height) }
    val width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
    val height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
    return if (width > 0 && height > 0) MoneyWidgetRenderer.Size(width.toFloat(), height.toFloat()) else DEFAULT_SIZE
  }

  private fun publish(widgetId: Int, now: Long) {
    try {
      val previous = preferences.getString(timelineKey(widgetId), null)?.let(::parseTimeline)
      val result = renderer.render(
        config = config(widgetId),
        data = data(),
        size = size(widgetId),
        now = now,
        previousCents = previous?.shownAt(now),
        click = openApp(widgetId),
        clickTemplate = openAppTemplate(widgetId),
        previousSignature = preferences.getString(signatureKey(widgetId), null),
        ambientSnapshots = preferences.getString(ambientKey(widgetId), null),
      )
      if (result.full) manager.updateAppWidget(widgetId, result.views)
      else manager.partiallyUpdateAppWidget(widgetId, result.views)
      preferences.edit()
        .putString(signatureKey(widgetId), result.signature)
        .putString(timelineKey(widgetId), serializeTimeline(result.timeline))
        .putString(ambientKey(widgetId), result.ambientSnapshots)
        .apply()
    } catch (error: Exception) {
      Log.e(TAG, "Couldn't render money widget $widgetId", error)
      forgetPublished(widgetId)
    }
  }

  private fun forgetPublished(widgetId: Int) {
    preferences.edit().remove(signatureKey(widgetId)).remove(timelineKey(widgetId)).remove(ambientKey(widgetId)).apply()
  }

  private fun scheduleSync() {
    val alarms = context.getSystemService(AlarmManager::class.java)
    val intent = PendingIntent.getBroadcast(
      context,
      SYNC_REQUEST,
      Intent(context, MoneyWidgetProvider::class.java).setAction(MoneyWidgetProvider.ACTION_SYNC),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val next = ids().mapNotNull { id -> preferences.getString(timelineKey(id), null)?.let(::parseTimeline)?.nextSyncAt }.minOrNull()
    if (next == null) {
      alarms.cancel(intent)
      return
    }
    alarms.set(AlarmManager.RTC, next, intent)
  }

  private fun openApp(widgetId: Int): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(
      context,
      widgetId,
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  /** Taps inside the ticker go through the collection's template, which must be mutable. */
  private fun openAppTemplate(widgetId: Int): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(
      context,
      TEMPLATE_REQUEST + widgetId,
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
    )
  }

  private fun serializeTimeline(timeline: MoneyTimeline): String = JSONObject()
    .put("startAt", timeline.startAt)
    .put("tick", timeline.tick)
    .put("nextSyncAt", timeline.nextSyncAt)
    .put("rate", timeline.ratePerHour)
    .put("cents", JSONArray(timeline.cents.toList()))
    .toString()

  private fun parseTimeline(serialized: String): MoneyTimeline? = runCatching {
    val json = JSONObject(serialized)
    val cents = json.getJSONArray("cents")
    MoneyTimeline(
      startAt = json.getLong("startAt"),
      tick = json.getLong("tick"),
      cents = LongArray(cents.length()) { cents.getLong(it) },
      nextSyncAt = json.getLong("nextSyncAt"),
      ratePerHour = json.optDouble("rate", 0.0),
    )
  }.getOrNull()

  private fun configKey(id: Int) = "config-$id"
  private fun signatureKey(id: Int) = "signature-$id"
  private fun timelineKey(id: Int) = "timeline-$id"
  private fun ambientKey(id: Int) = "ambient-$id"
  private fun keys(id: Int) = listOf(configKey(id), signatureKey(id), timelineKey(id), ambientKey(id))

  companion object {
    private const val TAG = "MoneyWidgets"
    private const val DATA = "data"
    private const val DEFAULT_CONFIG = "default-config"
    private const val SYNC_REQUEST = 1
    private const val TEMPLATE_REQUEST = 1_000_000
    internal val DEFAULT_SIZE = MoneyWidgetRenderer.Size(260f, 130f)
    private val PIN_PREVIEW_SIZE = MoneyWidgetRenderer.Size(280f, 140f)

    @Volatile private var instance: MoneyWidgets? = null

    fun get(context: Context): MoneyWidgets = instance ?: synchronized(this) {
      instance ?: MoneyWidgets(context.applicationContext).also { instance = it }
    }
  }
}
