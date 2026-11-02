package expo.modules.themetransition

import android.app.Activity
import android.view.Choreographer
import android.view.View
import android.view.ViewGroup
import android.view.animation.PathInterpolator
import android.widget.FrameLayout
import java.util.concurrent.ConcurrentHashMap

private const val MAX_REVEALS = 6
private const val MAX_FRAMES = 6

internal class RevealController(private val activity: () -> Activity?) {
  private class Reveal(val view: RevealView) {
    var revealing = false
    var cancel: (() -> Unit)? = null
  }

  // Oldest first, and oldest on top: each reveal uncovers what the screen became one step later.
  private val reveals = mutableListOf<Reveal>()
  private var pending: Reveal? = null
  private val frames = LinkedHashMap<String, RevealFrame>()
  private val frameKeys = ConcurrentHashMap.newKeySet<String>()
  private var cover: RevealView? = null
  private var coverGeneration = 0
  private var coveredRoot: View? = null

  fun hasFrames(from: String, to: String) = frameKeys.contains(from) && frameKeys.contains(to)

  fun begin(key: String?): Boolean {
    dropPending()
    val activity = activity() ?: return false
    val content = activity.findViewById<ViewGroup>(android.R.id.content) ?: return false
    val root = liveRoot(content) ?: return false
    val width = content.width
    val height = content.height

    val cached = key?.let(frames::get)?.takeIf { it.width == width && it.height == height }
    val frame = cached?.retain() ?: RevealFrame.capture(root, width, height) ?: return false
    // Until the last change has settled, the live screen may still show the look before it.
    val settled = reveals.all { it.revealing } && cover == null
    if (cached == null && key != null && settled) keepFrame(key, frame)

    val reveal = Reveal(RevealView(activity, frame))
    attach(content, reveal.view, width, height)
    reveals.add(reveal)
    pending = reveal
    removeCover()
    enforceRevealCap()
    return true
  }

  fun dropPending() {
    pending?.let {
      pending = null
      remove(it)
    }
  }

  fun commit(originX: Double, originY: Double, durationMs: Int, settleFrames: Int) {
    val reveal = pending ?: return
    pending = null
    waitFrames(settleFrames) {
      if (reveals.contains(reveal)) play(reveal, originX, originY, durationMs)
    }
  }

  fun flip(from: String, to: String, originX: Double, originY: Double, durationMs: Int) {
    val outgoing = frames[from] ?: return
    val incoming = frames[to] ?: return
    val activity = activity() ?: return
    val content = activity.findViewById<ViewGroup>(android.R.id.content) ?: return
    val root = liveRoot(content) ?: return

    showCover(activity, content, root, incoming)
    val reveal = Reveal(RevealView(activity, outgoing.retain()))
    attach(content, reveal.view, outgoing.width, outgoing.height)
    reveals.add(reveal)
    enforceRevealCap()
    play(reveal, originX, originY, durationMs)
  }

  fun endBurst(settleFrames: Int, fadeMs: Int) {
    val target = cover ?: return
    val generation = coverGeneration
    waitFrames(settleFrames) {
      if (cover === target && generation == coverGeneration) {
        uncoverRoot()
        target.animate().alpha(0f).setDuration(fadeMs.toLong()).withEndAction {
          if (cover === target && generation == coverGeneration) removeCover()
        }.start()
      }
    }
  }

  fun clearFrames() {
    frames.values.forEach { it.release() }
    frames.clear()
    frameKeys.clear()
  }

  fun removeAll() {
    pending = null
    reveals.toList().forEach(::remove)
    removeCover()
    clearFrames()
  }

  private fun liveRoot(content: ViewGroup): View? =
    (0 until content.childCount).map(content::getChildAt).firstOrNull { it !is RevealView }

  private fun keepFrame(key: String, frame: RevealFrame) {
    frames.remove(key)?.release()
    frames[key] = frame.retain()
    frameKeys.add(key)
    while (frames.size > MAX_FRAMES) {
      val oldest = frames.keys.first()
      frames.remove(oldest)?.release()
      frameKeys.remove(oldest)
    }
  }

  private fun showCover(activity: Activity, content: ViewGroup, root: View, frame: RevealFrame) {
    coverGeneration += 1
    // Transparent rather than invisible: Android skips drawing it, but it still takes touches.
    root.alpha = 0f
    coveredRoot = root
    val existing = cover
    if (existing != null) {
      existing.animate().cancel()
      existing.alpha = 1f
      existing.show(frame)
      return
    }
    val view = RevealView(activity, frame.retain())
    view.layoutParams = FrameLayout.LayoutParams(frame.width, frame.height)
    view.elevation = maxElevation(content)
    content.addView(view, content.indexOfChild(root) + 1)
    cover = view
  }

  private fun uncoverRoot() {
    coveredRoot?.alpha = 1f
    coveredRoot = null
  }

  private fun removeCover() {
    uncoverRoot()
    val view = cover ?: return
    cover = null
    coverGeneration += 1
    view.animate().cancel()
    (view.parent as? ViewGroup)?.removeView(view)
    view.release()
  }

  private fun attach(content: ViewGroup, view: RevealView, width: Int, height: Int) {
    view.layoutParams = FrameLayout.LayoutParams(width, height)
    view.elevation = maxElevation(content)
    val lowest = reveals.minOfOrNull { content.indexOfChild(it.view) }?.takeIf { it >= 0 }
    content.addView(view, lowest ?: content.childCount)
  }

  // Equal elevation is what makes child index decide z-order.
  private fun maxElevation(content: ViewGroup) =
    (0 until content.childCount).maxOfOrNull { content.getChildAt(it).elevation } ?: 0f

  private fun enforceRevealCap() {
    while (reveals.size > MAX_REVEALS) remove(reveals.first())
  }

  private fun remove(reveal: Reveal) {
    if (!reveals.remove(reveal)) return
    reveal.cancel?.invoke()
    reveal.cancel = null
    (reveal.view.parent as? ViewGroup)?.removeView(reveal.view)
    reveal.view.release()
  }

  // Clocked from frame time because a ValueAnimator's length follows the system's animator duration scale.
  private fun play(reveal: Reveal, originX: Double, originY: Double, durationMs: Int) {
    reveal.revealing = true
    val view = reveal.view
    val density = view.resources.displayMetrics.density
    val parent = view.parent as? View
    val x = if (originX >= 0) (originX * density).toFloat() else (parent?.width ?: 0) / 2f
    val y = if (originY >= 0) (originY * density).toFloat() else (parent?.height ?: 0) / 2f
    view.aim(x, y)

    if (durationMs <= 0) {
      remove(reveal)
      return
    }

    val curve = PathInterpolator(0.4f, 0f, 0.2f, 1f)
    val choreographer = Choreographer.getInstance()
    val durationNanos = durationMs * 1_000_000L
    var startNanos = -1L
    // Removing the view in the last tick would drop the frame that draws the end of the ring.
    val finish = Choreographer.FrameCallback { remove(reveal) }
    lateinit var tick: Choreographer.FrameCallback
    tick =
      Choreographer.FrameCallback { now ->
        if (startNanos < 0L) startNanos = now
        val fraction = ((now - startNanos).toFloat() / durationNanos).coerceIn(0f, 1f)
        view.progress = curve.getInterpolation(fraction)
        choreographer.postFrameCallback(if (fraction < 1f) tick else finish)
      }

    reveal.cancel = {
      choreographer.removeFrameCallback(tick)
      choreographer.removeFrameCallback(finish)
    }
    choreographer.postFrameCallback(tick)
  }

  private fun waitFrames(frames: Int, work: () -> Unit) {
    if (frames <= 0) {
      work()
      return
    }
    var remaining = frames
    val choreographer = Choreographer.getInstance()
    lateinit var callback: Choreographer.FrameCallback
    callback =
      Choreographer.FrameCallback {
        remaining -= 1
        if (remaining <= 0) work() else choreographer.postFrameCallback(callback)
      }
    choreographer.postFrameCallback(callback)
  }
}
