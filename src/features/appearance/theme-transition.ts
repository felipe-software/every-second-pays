import { Component, type PropsWithChildren, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { ThemeTransitionConfig, withThemeTransition } from "react-native-nitro-theme-transition";

export type ThemeTransitionOrigin = { x: number; y: number };

const REVEAL_DURATION_MS = 650;
const SETTLE_FRAMES = 3;

let pendingReveal: ThemeTransitionConfig | null = null;
let scheduleCapture: (() => void) | null = null;

// Captures once the change has rendered but before it commits, so press feedback stays live during the render.
export class InterfaceTransitionBoundary extends Component<PropsWithChildren> {
    componentDidMount() {
        scheduleCapture = () => this.forceUpdate();
    }

    componentWillUnmount() {
        scheduleCapture = null;
    }

    getSnapshotBeforeUpdate() {
        if (pendingReveal) {
            withThemeTransition(() => {}, pendingReveal);
            pendingReveal = null;
        }
        return null;
    }

    componentDidUpdate() {}

    render() {
        return this.props.children;
    }
}

export function useReduceMotion() {
    const [reduceMotion, setReduceMotion] = useState(true);

    useEffect(() => {
        let mounted = true;
        AccessibilityInfo.isReduceMotionEnabled()
            .then((enabled) => {
                if (mounted) setReduceMotion(enabled);
            })
            .catch(() => {});
        const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
        return () => {
            mounted = false;
            subscription.remove();
        };
    }, []);

    return reduceMotion;
}

export function runInterfaceTransition(
    applyChange: () => void,
    origin: ThemeTransitionOrigin | undefined,
    reduceMotion: boolean,
    config?: Partial<ThemeTransitionConfig>
) {
    if (reduceMotion || !scheduleCapture) {
        applyChange();
        return;
    }

    pendingReveal = {
        kind: "circularRevealInverse",
        settleFrames: SETTLE_FRAMES,
        durationMs: REVEAL_DURATION_MS,
        ...(origin ? { origin } : {}),
        ...config,
    };
    scheduleCapture();
    applyChange();
}
