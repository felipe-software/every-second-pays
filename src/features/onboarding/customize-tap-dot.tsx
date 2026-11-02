import { StyleSheet } from "react-native";
import Animated, { css, cubicBezier } from "react-native-reanimated";

import { withAlpha } from "@/features/appearance/color";

import type { ArtboardPoint } from "./customize-layout";
import { useOnboardingTheme } from "./look";

const TAP = css.keyframes({
    "0%": { transform: [{ scale: 1 }] },
    "35%": { transform: [{ scale: 0.7 }] },
    "100%": { transform: [{ scale: 1 }] },
});
const RIPPLE = css.keyframes({
    from: { opacity: 0.8, transform: [{ scale: 0.7 }] },
    to: { opacity: 0, transform: [{ scale: 1.9 }] },
});

export function CustomizeTapDot({
    at,
    shown,
    jump,
    presses,
}: {
    at: ArtboardPoint;
    shown: boolean;
    jump: boolean;
    presses: number;
}) {
    const { colors } = useOnboardingTheme();
    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.dot,
                {
                    opacity: shown ? 1 : 0,
                    transform: [{ translateX: at.x }, { translateY: at.y }],
                    transitionProperty: jump ? ["opacity"] : ["transform", "opacity"],
                    transitionDuration: jump ? [260] : [380, 260],
                    transitionTimingFunction: jump ? ["ease"] : [cubicBezier(0.45, 0, 0.25, 1), "ease"],
                },
            ]}
        >
            {/* Keyed by the press count, so every press replays from the start. */}
            <Animated.View
                key={`ripple-${presses}`}
                style={[
                    styles.dotRipple,
                    { borderColor: withAlpha(colors.ink, 0.3) },
                    presses > 0 && {
                        animationName: RIPPLE,
                        animationDuration: 560,
                        animationTimingFunction: "ease-out",
                        animationFillMode: "both",
                    },
                ]}
            />
            <Animated.View
                key={`finger-${presses}`}
                style={[
                    styles.dotFinger,
                    { backgroundColor: withAlpha(colors.ink, 0.16) },
                    presses > 0 && {
                        animationName: TAP,
                        animationDuration: 420,
                        animationTimingFunction: "ease-out",
                        animationFillMode: "both",
                    },
                ]}
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    dot: {
        position: "absolute",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        zIndex: 5,
    },
    dotFinger: {
        position: "absolute",
        left: -16,
        top: -16,
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.75)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.16)",
    },
    dotRipple: {
        position: "absolute",
        left: -16,
        top: -16,
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        opacity: 0,
    },
});
