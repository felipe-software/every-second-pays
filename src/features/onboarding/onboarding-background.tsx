import { memo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { useEarningsTheme } from "@/features/earnings/theme";

type Glow = { id: string; cx: number; cy: number; rx: number; ry: number; color: string; opacity: number };

function GlowLayer({ glows, width, height }: { glows: Glow[]; width: number; height: number }) {
    return (
        <Svg width={width} height={height}>
            <Defs>
                {glows.map((glow) => (
                    <RadialGradient key={glow.id} id={glow.id} cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0" stopColor={glow.color} stopOpacity={glow.opacity} />
                        <Stop offset="0.55" stopColor={glow.color} stopOpacity={glow.opacity * 0.42} />
                        <Stop offset="1" stopColor={glow.color} stopOpacity={0} />
                    </RadialGradient>
                ))}
            </Defs>
            {glows.map((glow) => (
                <Ellipse key={glow.id} cx={glow.cx} cy={glow.cy} rx={glow.rx} ry={glow.ry} fill={`url(#${glow.id})`} />
            ))}
        </Svg>
    );
}

/**
 * The theme's canvas with soft accent glows painted as radial gradients, so no blur is needed.
 * The glows drift sideways with the pager, and `pulse` (0–1) floods the top glow when money lands.
 */
export const OnboardingBackground = memo(function OnboardingBackground({
    scroll,
    pulse,
}: {
    scroll: SharedValue<number>;
    pulse: SharedValue<number>;
}) {
    const { colors, isDark } = useEarningsTheme();
    const { width, height } = useWindowDimensions();
    // Wider than the screen so the drift never reveals an edge.
    const layerWidth = width * 1.6;
    const accentStrength = isDark ? 0.5 : 0.38;

    const glows: Glow[] = [
        { id: "top", cx: layerWidth / 2, cy: -height * 0.02, rx: width * 0.95, ry: height * 0.42, color: colors.accent, opacity: accentStrength },
        { id: "low", cx: layerWidth * 0.22, cy: height * 0.98, rx: width * 0.8, ry: height * 0.3, color: colors.accentDeep, opacity: isDark ? 0.26 : 0.16 },
        { id: "side", cx: layerWidth * 0.86, cy: height * 0.58, rx: width * 0.55, ry: height * 0.24, color: colors.accent, opacity: isDark ? 0.18 : 0.14 },
    ];

    const driftStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -(width * 0.3) - (scroll.get() / Math.max(width, 1)) * width * 0.08 }],
    }));
    const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));

    return (
        <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas }]}
        >
            <Animated.View style={[styles.layer, { width: layerWidth }, driftStyle]}>
                <GlowLayer glows={glows} width={layerWidth} height={height} />
                <Animated.View style={[StyleSheet.absoluteFill, pulseStyle]}>
                    <GlowLayer
                        glows={[{ ...glows[0], id: "pulse", ry: height * 0.5, opacity: isDark ? 0.55 : 0.45 }]}
                        width={layerWidth}
                        height={height}
                    />
                </Animated.View>
            </Animated.View>
        </View>
    );
});

const styles = StyleSheet.create({
    layer: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
    },
});
