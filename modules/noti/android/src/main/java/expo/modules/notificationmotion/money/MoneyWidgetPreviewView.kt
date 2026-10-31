package expo.modules.notificationmotion.money

import android.annotation.SuppressLint
import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProviderInfo
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.ViewGroup
import android.view.ViewTreeObserver
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.Executors

@SuppressLint("ViewConstructor")
class MoneyWidgetPreviewView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  // React Native swallows native children's layout requests, so each new ticker frame would draw
  // blank once before Expo's posted layout runs. Laying out before each draw avoids the flicker.
  private val layoutBeforeDraw = ViewTreeObserver.OnPreDrawListener {
    if (host.isLayoutRequested && width > 0 && height > 0) {
      host.measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
      host.layout(0, 0, width, height)
    }
    true
  }

  private val host = AppWidgetHostView(context)
  private val handler = Handler(Looper.getMainLooper())
  private var config: String? = null
  private var active = false
  private var widthDp = 0f
  private var heightDp = 0f
  private var timeline: MoneyTimeline? = null
  private var ambientSnapshots: String? = null
  private val refresh = Runnable { render() }
  private val renderSoon = Runnable { render() }
  @Volatile private var latestRender = 0

  init {
    clipChildren = false
    addView(host, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    if (Build.VERSION.SDK_INT >= 31) host.setExecutor(renderExecutor)
    host.alpha = 0f
  }

  fun setConfig(value: String) {
    if (value == config) return
    config = value
    scheduleRender()
  }

  fun setRevision(@Suppress("UNUSED_PARAMETER") value: Int) {
    scheduleRender()
  }

  fun setActive(value: Boolean) {
    if (value == active) return
    active = value
    scheduleRender()
  }

  private fun scheduleRender() {
    handler.removeCallbacks(renderSoon)
    handler.post(renderSoon)
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    val density = resources.displayMetrics.density
    widthDp = w / density
    heightDp = h / density
    host.layout(0, 0, w, h)
    scheduleRender()
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    host.measure(
      MeasureSpec.makeMeasureSpec(r - l, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(b - t, MeasureSpec.EXACTLY),
    )
    host.layout(0, 0, r - l, b - t)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    viewTreeObserver.addOnPreDrawListener(layoutBeforeDraw)
    scheduleRender()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    viewTreeObserver.removeOnPreDrawListener(layoutBeforeDraw)
    handler.removeCallbacks(refresh)
    handler.removeCallbacks(renderSoon)
    latestRender++
  }

  private fun render() {
    handler.removeCallbacks(refresh)
    if (Build.VERSION.SDK_INT < 31 || !isAttachedToWindow || widthDp < 40 || heightDp < 40) return
    val serialized = config ?: return
    val size = MoneyWidgetRenderer.Size(widthDp, heightDp)
    val now = System.currentTimeMillis()
    val previousCents = timeline?.shownAt(now)
    val previousSnapshots = ambientSnapshots
    val frames = if (active) ACTIVE_FRAMES else INACTIVE_FRAMES
    val request = ++latestRender
    renderExecutor.execute {
      if (request != latestRender) return@execute
      try {
        val info = providerInfo(context)
        val result = MoneyWidgetRenderer(context).render(
          config = MoneyConfig.parse(serialized),
          data = MoneyWidgets.get(context).data(),
          size = size,
          now = now,
          previousCents = previousCents,
          click = null,
          clickTemplate = null,
          // A host view can't merge partial updates, so the preview always renders in full.
          previousSignature = null,
          ambientSnapshots = previousSnapshots,
          maxFrames = frames,
        )
        handler.post {
          if (request == latestRender) show(result, info, now)
        }
      } catch (error: Exception) {
        Log.e("MoneyWidgetPreview", "Couldn't render the preview", error)
      }
    }
  }

  private fun show(result: MoneyWidgetRenderer.Result, info: AppWidgetProviderInfo?, renderedAt: Long) {
    if (host.appWidgetInfo == null && info != null) {
      host.setAppWidget(0, info)
      host.setPadding(0, 0, 0, 0)
    }
    host.updateAppWidget(result.views)
    if (host.alpha < 1f) host.animate().alpha(1f).setDuration(FADE_IN_MS)
    timeline = result.timeline
    ambientSnapshots = result.ambientSnapshots
    handler.postDelayed(refresh, (result.timeline.nextSyncAt - renderedAt).coerceIn(5_000, 60_000))
  }

  private companion object {
    const val ACTIVE_FRAMES = 90
    const val INACTIVE_FRAMES = 1
    const val FADE_IN_MS = 160L
    val renderExecutor = Executors.newSingleThreadExecutor { Thread(it, "MoneyWidgetPreview") }

    @Volatile private var cachedProviderInfo: AppWidgetProviderInfo? = null

    fun providerInfo(context: Context): AppWidgetProviderInfo? = cachedProviderInfo ?: run {
      val provider = ComponentName(context, MoneyWidgetProvider::class.java)
      AppWidgetManager.getInstance(context).installedProviders
        .firstOrNull { it.provider == provider }
        ?.also { cachedProviderInfo = it }
    }
  }
}
