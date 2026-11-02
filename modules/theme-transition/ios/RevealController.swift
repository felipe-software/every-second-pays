import UIKit

private let revealCurve = CAMediaTimingFunction(controlPoints: 0.4, 0, 0.2, 1)
private let maxReveals = 6

// Lives one level above the app's window, so a capture of that window can't copy the reveals already running.
private final class OverlayWindow: UIWindow {
  override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    nil
  }
}

private final class OverlayRootViewController: UIViewController {
  override func loadView() {
    let view = UIView()
    view.backgroundColor = .clear
    view.isUserInteractionEnabled = false
    self.view = view
  }
}

private final class Reveal {
  let view: UIView
  // A presented sheet is its own touch surface, so its offset has to be read when the touch happens.
  let originOffset: CGPoint

  init(view: UIView, originOffset: CGPoint) {
    self.view = view
    self.originOffset = originOffset
  }

  func stop() {
    view.layer.mask?.removeAllAnimations()
    view.layer.mask = nil
    view.removeFromSuperview()
  }
}

private final class FrameWaiter: NSObject {
  private var remaining: Int
  private var work: (() -> Void)?
  private var link: CADisplayLink?

  init(frames: Int, work: @escaping () -> Void) {
    remaining = frames
    self.work = work
    super.init()
    let link = CADisplayLink(target: self, selector: #selector(tick))
    link.add(to: .main, forMode: .common)
    self.link = link
  }

  @objc private func tick() {
    remaining -= 1
    guard remaining <= 0 else { return }
    let finished = work
    link?.invalidate()
    link = nil
    work = nil
    finished?()
  }
}

final class RevealController {
  private var reveals: [Reveal] = []
  private var pending: Reveal?
  private var overlay: OverlayWindow?

  func begin() -> Bool {
    if let stranded = pending {
      pending = nil
      remove(stranded)
    }

    guard let window = appWindow(), let snapshot = captureAppearance(sizedTo: window) else { return false }
    guard let host = overlayWindow(over: window) else { return false }

    snapshot.frame = host.bounds
    snapshot.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    snapshot.isUserInteractionEnabled = false

    if let bottomMost = reveals.last {
      host.insertSubview(snapshot, belowSubview: bottomMost.view)
    } else {
      host.addSubview(snapshot)
    }

    let reveal = Reveal(view: snapshot, originOffset: Self.surfaceOffset(in: window))
    reveals.append(reveal)
    pending = reveal

    while reveals.count > maxReveals, let oldest = reveals.first {
      remove(oldest)
    }
    return true
  }

  func commit(originX: Double, originY: Double, durationMs: Int, settleFrames: Int) {
    guard let reveal = pending else { return }
    pending = nil

    let play = { [weak self] in
      guard let self, self.reveals.contains(where: { $0 === reveal }) else { return }
      self.play(reveal, originX: originX, originY: originY, durationMs: durationMs)
    }

    if settleFrames > 0 {
      _ = FrameWaiter(frames: settleFrames, work: play)
    } else {
      play()
    }
  }

  func removeAll() {
    pending = nil
    reveals.forEach { $0.stop() }
    reveals.removeAll()
    releaseOverlay()
  }

  private func play(_ reveal: Reveal, originX: Double, originY: Double, durationMs: Int) {
    guard durationMs > 0 else {
      remove(reveal)
      return
    }

    let bounds = reveal.view.bounds
    let origin =
      originX >= 0 && originY >= 0
      ? CGPoint(x: CGFloat(originX) + reveal.originOffset.x, y: CGFloat(originY) + reveal.originOffset.y)
      : CGPoint(x: bounds.midX, y: bounds.midY)
    let corners = [
      CGPoint(x: bounds.minX, y: bounds.minY), CGPoint(x: bounds.maxX, y: bounds.minY),
      CGPoint(x: bounds.minX, y: bounds.maxY), CGPoint(x: bounds.maxX, y: bounds.maxY),
    ]
    let maxRadius = corners.map { hypot($0.x - origin.x, $0.y - origin.y) }.max() ?? 0

    let path = { (radius: CGFloat) -> CGPath in
      let path = UIBezierPath(rect: bounds)
      // Never exactly zero: a degenerate arc would change the path's structure and break the interpolation.
      path.append(UIBezierPath(arcCenter: origin, radius: max(radius, 0.01), startAngle: 0, endAngle: .pi * 2, clockwise: true))
      return path.cgPath
    }

    let mask = CAShapeLayer()
    mask.frame = bounds
    mask.fillColor = UIColor.white.cgColor
    mask.fillRule = .evenOdd
    mask.path = path(0)
    reveal.view.layer.mask = mask

    CATransaction.begin()
    CATransaction.setCompletionBlock { [weak self] in self?.remove(reveal) }
    let animation = CABasicAnimation(keyPath: "path")
    animation.fromValue = path(0)
    animation.toValue = path(maxRadius)
    animation.duration = Double(durationMs) / 1000
    animation.timingFunction = revealCurve
    mask.path = path(maxRadius)
    mask.add(animation, forKey: "themeTransitionReveal")
    CATransaction.commit()
  }

  private func remove(_ reveal: Reveal) {
    reveals.removeAll { $0 === reveal }
    reveal.stop()
    if reveals.isEmpty { releaseOverlay() }
  }

  private func captureAppearance(sizedTo appWindow: UIWindow) -> UIView? {
    if reveals.isEmpty, let screen = appWindow.windowScene?.screen, appWindow.frame == screen.bounds {
      return screen.snapshotView(afterScreenUpdates: false)
    }
    return captureWindows(sizedTo: appWindow)
  }

  private func captureWindows(sizedTo appWindow: UIWindow) -> UIView? {
    guard let scene = appWindow.windowScene else {
      return appWindow.snapshotView(afterScreenUpdates: false)
    }

    let visible = scene.windows.filter {
      !($0 is OverlayWindow) && !$0.isHidden && $0.alpha > 0 && $0.bounds.width > 0
    }
    if visible.count <= 1 {
      return (visible.first ?? appWindow).snapshotView(afterScreenUpdates: false)
    }

    let ordered = visible.enumerated().sorted {
      $0.element.windowLevel.rawValue == $1.element.windowLevel.rawValue
        ? $0.offset < $1.offset
        : $0.element.windowLevel.rawValue < $1.element.windowLevel.rawValue
    }.map(\.element)

    let container = UIView(frame: appWindow.bounds)
    container.backgroundColor = .clear
    container.isUserInteractionEnabled = false
    var captured = false
    for source in ordered {
      guard let piece = source.snapshotView(afterScreenUpdates: false) else { continue }
      piece.frame = source.frame.offsetBy(dx: -appWindow.frame.minX, dy: -appWindow.frame.minY)
      piece.alpha = source.alpha
      piece.isUserInteractionEnabled = false
      container.addSubview(piece)
      captured = true
    }
    return captured ? container : nil
  }

  private func overlayWindow(over window: UIWindow) -> UIWindow? {
    guard let scene = window.windowScene else { return nil }
    if let existing = overlay, existing.windowScene === scene {
      existing.frame = window.frame
      return existing
    }

    releaseOverlay()
    let host = OverlayWindow(windowScene: scene)
    host.frame = window.frame
    host.windowLevel = UIWindow.Level(rawValue: window.windowLevel.rawValue + 1)
    host.backgroundColor = .clear
    host.isOpaque = false
    host.isUserInteractionEnabled = false
    host.rootViewController = OverlayRootViewController()
    // Never makeKeyAndVisible: taking key status from the app would dismiss the keyboard.
    host.isHidden = false
    overlay = host
    return host
  }

  private func releaseOverlay() {
    overlay?.isHidden = true
    overlay = nil
  }

  private func appWindow() -> UIWindow? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let scene =
      scenes.first(where: { $0.windows.contains(where: \.isKeyWindow) })
      ?? scenes.first(where: { $0.activationState == .foregroundActive })
      ?? scenes.first
    guard let scene else { return nil }

    let candidates = scene.windows.filter {
      !($0 is OverlayWindow) && !$0.isHidden && $0.alpha > 0.01 && $0.rootViewController != nil
    }
    return candidates.first(where: { $0.windowLevel == .normal })
      ?? candidates.first(where: \.isKeyWindow)
      ?? candidates.first
  }

  private static func surfaceOffset(in window: UIWindow) -> CGPoint {
    var controller = window.rootViewController
    while let presented = controller?.presentedViewController {
      controller = presented
    }
    guard
      let controller,
      controller !== window.rootViewController,
      let view = controller.viewIfLoaded,
      view.window === window
    else { return .zero }
    return view.convert(view.bounds, to: window).origin
  }
}
