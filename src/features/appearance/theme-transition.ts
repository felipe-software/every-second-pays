import { Component, type PropsWithChildren, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { ThemeTransitionConfig, withThemeTransition } from "react-native-nitro-theme-transition";
import { create } from "zustand";

export type ThemeTransitionOrigin = { x: number; y: number };

const REVEAL_DURATION_MS = 650;
const SETTLE_FRAMES = 3;
// Covers the mount and settle frames before the reveal, so the thaw lands after it ends.
const THAW_MARGIN_MS = 300;

type PendingReveal = ThemeTransitionConfig & { durationMs: number };

const useRunningTransitions = create(() => ({ count: 0 }));
let pendingReveals: PendingReveal[] = [];

export function useInterfaceTransitionRunning() {
    return useRunningTransitions((state) => state.count > 0);
}

function startPendingReveals() {
    const started = pendingReveals.length;
    if (!started) return;
    const reveal = pendingReveals[started - 1];
    pendingReveals = [];
    withThemeTransition(() => {}, reveal);
    setTimeout(() => useRunningTransitions.setState(({ count }) => ({ count: count - started })), reveal.durationMs + THAW_MARGIN_MS);
}

// Captures once the change has rendered but before it commits, so press feedback stays live during the render.
export class InterfaceTransitionBoundary extends Component<PropsWithChildren> {
    private unsubscribe?: () => void;

    componentDidMount() {
        this.unsubscribe = useRunningTransitions.subscribe(() => this.forceUpdate());
    }

    componentWillUnmount() {
        this.unsubscribe?.();
    }

    getSnapshotBeforeUpdate() {
        startPendingReveals();
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
    if (reduceMotion) {
        applyChange();
        return;
    }

    pendingReveals.push({
        kind: "circularRevealInverse",
        settleFrames: SETTLE_FRAMES,
        ...(origin ? { origin } : {}),
        ...config,
        durationMs: config?.durationMs ?? REVEAL_DURATION_MS,
    });
    useRunningTransitions.setState(({ count }) => ({ count: count + 1 }));
    applyChange();
}
