import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export type { ThemeTransitionOrigin } from "theme-transition";

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
