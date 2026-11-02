import ExpoModulesCore
import UIKit

public final class ThemeTransitionModule: Module {
  private let controller = RevealController()

  public func definition() -> ModuleDefinition {
    Name("ThemeTransition")

    Function("begin") { (_: String?) -> Bool in
      self.onMainSync { self.controller.begin() }
    }

    Function("commit") { (originX: Double, originY: Double, durationMs: Int, settleFrames: Int) in
      DispatchQueue.main.async {
        self.controller.commit(originX: originX, originY: originY, durationMs: durationMs, settleFrames: settleFrames)
      }
    }

    // Burst flipping is Android-only: JS falls back to a normal reveal when this returns false.
    Function("flip") { (_: String, _: String, _: Double, _: Double, _: Int) -> Bool in
      false
    }

    Function("endBurst") { (_: Int, _: Int) in
    }

    Function("clearFrames") {
    }

    OnDestroy {
      DispatchQueue.main.async { self.controller.removeAll() }
    }
  }

  private func onMainSync(_ block: () -> Bool) -> Bool {
    if Thread.isMainThread { return block() }
    return DispatchQueue.main.sync(execute: block)
  }
}
