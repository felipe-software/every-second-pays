package expo.modules.jellytabs

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.provider.Settings
import android.view.Choreographer
import android.view.MotionEvent
import android.view.View
import com.facebook.react.modules.core.ReactChoreographer
import com.facebook.react.uimanager.events.NativeGestureUtil
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import kotlin.math.min
import kotlin.math.roundToInt

internal const val TRACK_INSET_DP = 4f
internal const val BORDER_WIDTH_DP = 1f

private const val ITEM_HEIGHT_DP = 56f
private const val NANOS_PER_SECOND = 1_000_000_000.0
private const val NOMINAL_FRAME_SECONDS = 1.0 / 60.0
private const val GLOW_RADIUS_DP = 300f
private const val ACTIVE_PRESSED_RASTER_SCALE = 1.35f
private const val INACTIVE_PRESSED_RASTER_SCALE = 1.12f
private const val PRESSED_RASTER_THRESHOLD = 1.004

@SuppressLint("ViewConstructor")
class JellyTabBarView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext),
  Choreographer.FrameCallback {
  private val onTabPress by EventDispatcher()

  private val density = resources.displayMetrics.density
  private val motion = JellyTabBarMotion(
    density = density,
    // Reanimated's withSpring honours this setting, and the bar's own springs used it.
    reducedMotion = Settings.Global.getFloat(context.contentResolver, Settings.Global.TRANSITION_ANIMATION_SCALE, 1f) == 0f,
  )

  private val glowRadius = GLOW_RADIUS_DP * density
  private val surface = JellyTrackSurfaceView(context)
  private val glowClip = JellyLayerView(context).apply { clipToPill() }
  private val glow = JellyGlowView(context, glowRadius)
  private val inactiveRow = JellyLayerView(context)
  private val pill = JellyLayerView(context).apply { clipToPill() }
  private val activeRow = JellyLayerView(context)

  private val inactiveFaces = ArrayList<JellyTabFaceView>()
  private val activeFaces = ArrayList<JellyTabFaceView>()
  private val icons = HashMap<String, Bitmap>()
  private var labels = emptyList<String>()
  private var iconPaths = emptyList<String>()
  private var inactiveIconPaths = emptyList<String>()
  private var contentStyle = JellyTabContentStyle()
  private var areFacesStale = false

  private var activeContentColor = Color.BLACK
  private var inactiveContentColor = Color.BLACK

  private var controller: JellyTabBarController? = null
  private var hasSelection = false

  private var isTracking = false
  private var isPanActive = false
  private var panStartRawX = 0f
  private var panStartRawY = 0f

  private var isFrameScheduled = false
  private var lastFrameNanos = 0L

  init {
    clipChildren = false
    clipToPadding = false
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
    addView(surface)
    glowClip.addView(glow)
    addView(glowClip)
    addView(inactiveRow)
    pill.addView(activeRow)
    addView(pill)
  }

  fun setController(next: JellyTabBarController) {
    controller?.detach(this)
    controller = next
    next.attach(this)
  }

  fun setLabels(next: List<String>) {
    labels = next
    areFacesStale = true
  }

  fun setIconPaths(next: List<String>) {
    iconPaths = next
    areFacesStale = true
  }

  fun setInactiveIconPaths(next: List<String>) {
    inactiveIconPaths = next
    areFacesStale = true
  }

  internal fun setContentStyle(next: JellyTabContentStyle) {
    if (next == contentStyle) return
    contentStyle = next
    areFacesStale = true
  }

  fun commitTabs() {
    if (!areFacesStale) return
    areFacesStale = false
    inactiveRow.removeAllViews()
    activeRow.removeAllViews()
    inactiveFaces.clear()
    activeFaces.clear()
    for (index in 0 until min(labels.size, iconPaths.size)) {
      inactiveFaces.add(addFace(inactiveRow, index, isActive = false, color = inactiveContentColor))
      activeFaces.add(addFace(activeRow, index, isActive = true, color = activeContentColor))
    }
    layoutContent()
  }

  fun setSelectedIndex(index: Int) {
    pill.visibility = if (index >= 0) View.VISIBLE else View.INVISIBLE
    if (hasSelection) {
      motion.selectIndex(index)
      scheduleFrame()
    } else {
      hasSelection = true
      motion.snapToIndex(index)
    }
    applyPill()
  }

  fun setSurfaceColor(color: Int) = surface.setSurfaceColor(color)

  fun setOutlineColor(color: Int) = surface.setOutlineColor(color)

  fun setAccentColor(color: Int) {
    pill.setBackgroundColor(color)
    glow.setGlowColor(color)
  }

  fun setActiveContentColor(color: Int) {
    activeContentColor = color
    activeFaces.forEach { it.setContentColor(color) }
  }

  fun setInactiveContentColor(color: Int) {
    inactiveContentColor = color
    inactiveFaces.forEach { it.setContentColor(color) }
  }

  fun release() {
    cancelFrame()
    controller?.detach(this)
    controller = null
  }

  internal fun followProgress(progress: Double) {
    motion.followProgress(progress)
    applyPill()
  }

  internal fun activateTab(index: Int) {
    motion.activateIndex(index)
    scheduleFrame()
    emitTabPress(index)
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.getSize(heightMeasureSpec))
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    if (changed) layoutContent()
  }

  override fun onInterceptTouchEvent(event: MotionEvent) = true

  @SuppressLint("ClickableViewAccessibility")
  override fun onTouchEvent(event: MotionEvent): Boolean {
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> beginTouch(event)
      MotionEvent.ACTION_MOVE -> if (isTracking) {
        // The gesture handler's Pan activates on the first move and measures translation from there.
        if (!isPanActive) {
          isPanActive = true
          panStartRawX = event.rawX
          panStartRawY = event.rawY
        }
        motion.drag((event.rawX - panStartRawX).toDouble(), (event.rawY - panStartRawY).toDouble(), event.rawX.toDouble())
        applyInteraction()
        if (motion.isActive) scheduleFrame()
      }
      // A second finger cancels the pan, and a cancelled pan still settles on a tab.
      MotionEvent.ACTION_POINTER_DOWN, MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> finishTouch()
    }
    return true
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (motion.isActive) scheduleFrame()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    cancelFrame()
  }

  override fun doFrame(frameTimeNanos: Long) {
    isFrameScheduled = false
    val previousFrameNanos = lastFrameNanos
    lastFrameNanos = frameTimeNanos
    val deltaSeconds = if (previousFrameNanos == 0L) NOMINAL_FRAME_SECONDS else (frameTimeNanos - previousFrameNanos) / NANOS_PER_SECOND
    motion.step(deltaSeconds)
    applyInteraction()
    if (motion.ownsProgress) {
      controller?.publishProgress(motion.positionValue)
      motion.releaseProgressIfSettled()
    }
    if (motion.isActive) {
      scheduleFrame()
    } else {
      lastFrameNanos = 0L
    }
  }

  private fun beginTouch(event: MotionEvent) {
    isTracking = true
    isPanActive = false
    parent?.requestDisallowInterceptTouchEvent(true)
    NativeGestureUtil.notifyNativeGestureStarted(this, event)
    motion.begin(event.x.toDouble(), event.y.toDouble(), event.rawX.toDouble())
    applyInteraction()
    scheduleFrame()
  }

  private fun finishTouch() {
    if (!isTracking) return
    isTracking = false
    parent?.requestDisallowInterceptTouchEvent(false)
    val nextIndex = motion.finish()
    scheduleFrame()
    if (inactiveFaces.isNotEmpty()) emitTabPress(nextIndex)
  }

  private fun emitTabPress(index: Int) {
    onTabPress(mapOf("index" to index))
  }

  private fun scheduleFrame() {
    if (isFrameScheduled) return
    isFrameScheduled = true
    // Must run before Reanimated's NATIVE_ANIMATED_MODULE queue so the page moves in the same frame.
    ReactChoreographer.getInstance().postFrameCallback(ReactChoreographer.CallbackType.DISPATCH_UI, this)
  }

  private fun cancelFrame() {
    if (isFrameScheduled) {
      ReactChoreographer.getInstance().removeFrameCallback(ReactChoreographer.CallbackType.DISPATCH_UI, this)
    }
    isFrameScheduled = false
    lastFrameNanos = 0L
  }

  private fun addFace(row: JellyLayerView, index: Int, isActive: Boolean, color: Int): JellyTabFaceView {
    val pressedRasterScale = if (isActive) ACTIVE_PRESSED_RASTER_SCALE else INACTIVE_PRESSED_RASTER_SCALE
    val face = JellyTabFaceView(context, isActive, contentStyle, pressedRasterScale)
    val inactiveIconPath = inactiveIconPaths.getOrNull(index)?.takeIf { it.isNotEmpty() }
    val iconPath = if (isActive) iconPaths[index] else inactiveIconPath ?: iconPaths[index]
    face.setContent(labels[index], iconPath)
    face.setContentColor(color)
    row.addView(face)
    return face
  }

  private fun layoutContent() {
    if (width == 0 || height == 0) return

    surface.layout(0, 0, width, height)
    glowClip.layout(0, 0, width, height)
    val glowSize = (glowRadius * 2f).roundToInt()
    glow.layout(0, 0, glowSize, glowSize)
    inactiveRow.layout(0, 0, width, height)

    val tabCount = inactiveFaces.size
    val overhang = contentStyle.pillOverhangDp * density
    motion.setTrack(width.toDouble(), height.toDouble(), tabCount, overhang.toDouble())

    val inset = TRACK_INSET_DP * density
    val insetPx = inset.roundToInt()
    val itemHeight = ITEM_HEIGHT_DP * density

    // Yoga rounds each box from unrounded positions, which sit on whole dps horizontally for this bar.
    val unroundedLeft = (absoluteLeftInRoot() / density).roundToInt() * density
    val unroundedWidth = (width / density).roundToInt() * density
    val tabPitch = if (tabCount == 0) 0f else (unroundedWidth - inset * 2f - overhang) / tabCount
    val slotWidth = tabPitch + overhang

    val pillWidth = roundedSpan(unroundedLeft + inset, slotWidth)
    val pillHeight = roundedSpan(absoluteTopInRoot() + inset, itemHeight)
    pill.layout(insetPx, insetPx, insetPx + pillWidth, insetPx + pillHeight)
    activeRow.layout(-insetPx, -insetPx, width - insetPx, height - insetPx)
    activeRow.pivotX = insetPx + pillWidth / 2f
    activeRow.pivotY = insetPx + pillHeight / 2f

    for (index in 0 until tabCount) {
      val tabOffset = inset + tabPitch * index
      val box = TabBox(unroundedLeft + tabOffset, absoluteTopInRoot() + inset, slotWidth, itemHeight)
      inactiveFaces[index].place(tabOffset.roundToInt(), insetPx, box, ::tabIcon)
      activeFaces[index].place(tabOffset.roundToInt(), insetPx, box, ::tabIcon)
    }

    applyInteraction()
  }

  private fun tabIcon(path: String, iconWidth: Int, iconHeight: Int) =
    icons.getOrPut("$path|$iconWidth|$iconHeight") { rasterizeTabIcon(path, iconWidth, iconHeight) }

  private fun absoluteLeftInRoot(): Int {
    var total = left
    var ancestor = parent as? View
    while (ancestor != null) {
      total += ancestor.left
      ancestor = ancestor.parent as? View
    }
    return total
  }

  private fun absoluteTopInRoot(): Int {
    var total = top
    var ancestor = parent as? View
    while (ancestor != null) {
      total += ancestor.top
      ancestor = ancestor.parent as? View
    }
    return total
  }

  private fun applyInteraction() {
    val pressedScale = motion.pressedScale
    val distortionScaleX = motion.distortionScaleX
    val originOffset = motion.pointerOriginX - width / 2.0
    scaleX = (pressedScale * distortionScaleX).toFloat()
    scaleY = pressedScale.toFloat()
    translationX = (pressedScale * (originOffset + distortionScaleX * (motion.panelTranslateX - originOffset))).toFloat()
    translationY = (pressedScale * motion.translateY).toFloat()

    val tabScale = motion.activeTabScale
    val isBarEnlarged = pressedScale > PRESSED_RASTER_THRESHOLD
    val isActiveTabEnlarged = pressedScale * tabScale > PRESSED_RASTER_THRESHOLD
    for (index in activeFaces.indices) {
      val face = activeFaces[index]
      face.scaleX = tabScale.toFloat()
      face.scaleY = tabScale.toFloat()
      face.setPressedRaster(isActiveTabEnlarged)
    }
    for (index in inactiveFaces.indices) {
      inactiveFaces[index].setPressedRaster(isBarEnlarged)
    }

    applyPill()
    applyGlow()
  }

  private fun applyPill() {
    val offset = motion.pillOffsetX.toFloat()
    val pillScaleX = motion.pillScaleXValue.toFloat()
    val pillScaleY = motion.pillScaleYValue.toFloat()
    pill.translationX = offset
    pill.scaleX = pillScaleX
    pill.scaleY = pillScaleY
    activeRow.translationX = -offset / pillScaleX
    activeRow.scaleX = 1f / pillScaleX
    activeRow.scaleY = 1f / pillScaleY
  }

  private fun applyGlow() {
    val opacity = motion.glowOpacity.toFloat()
    glow.alpha = opacity
    if (opacity > 0f) {
      glow.translationX = motion.pointerOriginX.toFloat() - glowRadius
      glow.translationY = motion.pointerLocalY.toFloat() - glowRadius
    }
  }
}
