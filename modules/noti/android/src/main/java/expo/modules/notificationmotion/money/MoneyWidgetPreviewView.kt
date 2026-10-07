package expo.modules.notificationmotion.money

import android.annotation.SuppressLint
import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
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

/**
 * The real widget, live, inside the app: renders the same RemoteViews the launcher gets into an
 * AppWidgetHostView (collection adapters only apply inside one) and keeps its timeline fresh.
 */
@SuppressLint("ViewConstructor")
class MoneyWidgetPreviewView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  // React Native swallows layout requests from native children, so a frame the ticker adds
  // would draw unlaid (blank) for a frame before Expo's posted layout ran: a flicker every
  // second. Laying the widget out right before each draw avoids it.
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
  private var widthDp = 0f
  private var heightDp = 0f
  private var timeline: MoneyTimeline? = null
  private var ambientSnapshots: String? = null
  private val refresh = Runnable { render() }
  private val renderSoon = Runnable { render() }

  init {
    clipChildren = false
    addView(host, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    if (Build.VERSION.SDK_INT >= 31) {
      val manager = AppWidgetManager.getInstance(context)
      val provider = ComponentName(context, MoneyWidgetProvider::class.java)
      manager.installedProviders.firstOrNull { it.provider == provider }?.let { host.setAppWidget(0, it) }
    }
    host.setPadding(0, 0, 0, 0)
  }

  fun setConfig(value: String) {
    if (value == config) return
    config = value
    scheduleRender()
  }

  /** Bumped by the app when the published data changes, so the preview re-renders. */
  fun setRevision(@Suppress("UNUSED_PARAMETER") value: Int) {
    scheduleRender()
  }

  /** Props, size, and attachment often change together; render once for all of them. */
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
  }

  private fun render() {
    handler.removeCallbacks(refresh)
    if (Build.VERSION.SDK_INT < 31 || !isAttachedToWindow || widthDp < 40 || heightDp < 40) return
    val serialized = config ?: return
    try {
      val widgets = MoneyWidgets.get(context)
      val now = System.currentTimeMillis()
      val result = MoneyWidgetRenderer(context).render(
        config = MoneyConfig.parse(serialized),
        data = widgets.data(),
        size = MoneyWidgetRenderer.Size(widthDp, heightDp),
        now = now,
        previousCents = timeline?.shownAt(now),
        click = null,
        clickTemplate = null,
        // A host view can't merge partial updates, so the preview always renders in full.
        previousSignature = null,
        ambientSnapshots = ambientSnapshots,
        maxFrames = 90,
      )
      host.updateAppWidget(result.views)
      timeline = result.timeline
      ambientSnapshots = result.ambientSnapshots
      handler.postDelayed(refresh, (result.timeline.nextSyncAt - now).coerceIn(5_000, 60_000))
    } catch (error: Exception) {
      Log.e("MoneyWidgetPreview", "Couldn't render the preview", error)
    }
  }
}
