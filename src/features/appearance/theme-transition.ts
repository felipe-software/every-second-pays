import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { ThemeTransitionConfig, withThemeTransition } from "react-native-nitro-theme-transition";

export type ThemeTransitionOrigin = { x: number; y: number };

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

    withThemeTransition(applyChange, {
        kind: "circularRevealInverse",
        durationMs: 650,
        settleFrames: 10,
        ...(origin ? { origin } : {}),
        ...config
    });
}
