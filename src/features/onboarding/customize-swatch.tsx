import { Pressable, StyleSheet, View } from "react-native";
import Animated, { type CSSTransitionProperties } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { rippleConfig } from "@/components/elevated/ripple";
import { mixColors } from "@/features/appearance/color";
import { PALETTES, type PaletteId } from "@/features/appearance/palettes";
import { useI18n } from "@/features/i18n/i18n";

import { BAR, SWATCH_X } from "./customize-layout";
import { useOnboardingTheme } from "./look";
import { EASE_BOUNCY } from "./motion";

const SWAP: CSSTransitionProperties = {
    transitionProperty: ["opacity", "transform"],
    transitionDuration: [200, 420],
    transitionTimingFunction: ["ease", EASE_BOUNCY],
};

export function CustomizeSwatch({
    palette,
    color,
    selected,
    onPress,
}: {
    palette: PaletteId;
    color: string;
    selected: boolean;
    onPress: () => void;
}) {
    const { t } = useI18n();
    const { colors } = useOnboardingTheme();
    const index = PALETTES.findIndex((item) => item.id === palette);
    return (
        <Pressable
            testID={`onboarding-palette-${palette}`}
            accessibilityRole="radio"
            accessibilityLabel={t(`palette.${palette}`)}
            accessibilityState={{ checked: selected }}
            hitSlop={5}
            onPress={onPress}
            android_ripple={rippleConfig(colors.ink, 20)}
            style={[styles.swatch, { left: SWATCH_X[index] - BAR.x - 18 }]}
        >
            <View style={[styles.swatchEdge, { backgroundColor: mixColors(color, "#000000", 0.32) }]} />
            <View style={[styles.swatchFace, { backgroundColor: color }]} />
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.swatchRing,
                    { borderColor: color },
                    SWAP,
                    {
                        opacity: selected ? 1 : 0,
                        transform: [{ scale: selected ? 1 : 0.7 }],
                    },
                ]}
            />
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.swatchCheck,
                    SWAP,
                    { opacity: selected ? 1 : 0, transform: [{ scale: selected ? 1 : 0.3 }] },
                ]}
            >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                        d="M20 6 9 17l-5-5"
                        stroke={colors.onAccent}
                        strokeWidth={3.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    swatch: {
        position: "absolute",
        top: 12,
        width: 36,
        height: 39,
    },
    swatchEdge: {
        position: "absolute",
        left: 0,
        top: 3,
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    swatchFace: {
        position: "absolute",
        left: 0,
        top: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    swatchRing: {
        position: "absolute",
        left: -6,
        top: -4.5,
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
    },
    swatchCheck: {
        position: "absolute",
        left: 0,
        top: 0,
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
    },
});
