import { Pressable, StyleSheet, View } from "react-native";
import Animated, { type CSSTransitionProperties } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { rippleConfig } from "@/components/elevated/ripple";
import { useI18n } from "@/features/i18n/i18n";

import { useOnboardingTheme } from "./look";
import { EASE_SPRING } from "./motion";

const ICON_SWAP: CSSTransitionProperties = {
    transitionProperty: ["opacity", "transform"],
    transitionDuration: [260, 520],
    transitionTimingFunction: ["ease", EASE_SPRING],
};

export function CustomizeModeButton({ onPress }: { onPress: () => void }) {
    const { colors, look } = useOnboardingTheme();
    const { t } = useI18n();
    return (
        <Pressable
            testID="onboarding-mode"
            accessibilityRole="button"
            accessibilityLabel={t(look.dark ? "onboarding.customize.toLight" : "onboarding.customize.toDark")}
            hitSlop={5}
            onPress={onPress}
            android_ripple={rippleConfig(colors.ink, 20)}
            style={styles.mode}
        >
            <View style={[styles.modeEdge, { backgroundColor: colors.edgeRow }]} />
            <View style={[styles.modeFace, { backgroundColor: colors.cardFace, borderColor: colors.cardOutline }]} />
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.modeIcon,
                    ICON_SWAP,
                    {
                        opacity: look.dark ? 0 : 1,
                        transform: [{ rotate: look.dark ? "90deg" : "0deg" }, { scale: look.dark ? 0.4 : 1 }],
                    },
                ]}
            >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Circle cx={12} cy={12} r={4} stroke={colors.ink} strokeWidth={2.2} />
                    <Path
                        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
                        stroke={colors.ink}
                        strokeWidth={2.2}
                        strokeLinecap="round"
                    />
                </Svg>
            </Animated.View>
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.modeIcon,
                    ICON_SWAP,
                    {
                        opacity: look.dark ? 1 : 0,
                        transform: [{ rotate: look.dark ? "0deg" : "-90deg" }, { scale: look.dark ? 1 : 0.4 }],
                    },
                ]}
            >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                        d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
                        stroke={colors.ink}
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    mode: {
        position: "absolute",
        left: 268,
        top: 12,
        width: 36,
        height: 39,
    },
    modeEdge: {
        position: "absolute",
        left: 0,
        top: 3,
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    modeFace: {
        position: "absolute",
        left: 0,
        top: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
    },
    modeIcon: {
        position: "absolute",
        left: 9,
        top: 9,
        width: 18,
        height: 18,
    },
});
