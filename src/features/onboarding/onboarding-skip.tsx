import { Pressable, StyleSheet, Text } from "react-native";
import Animated from "react-native-reanimated";

import { rippleConfig } from "@/components/elevated/ripple";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { useOnboardingTheme } from "./look";
import { EASE_SPRING } from "./motion";

type OnboardingSkipProps = {
    shown: boolean;
    top: number;
    awaitingAnswer: boolean;
    onDecline: () => void;
    onExit: () => void;
};

export function OnboardingSkip({ shown, top, awaitingAnswer, onDecline, onExit }: OnboardingSkipProps) {
    const { colors } = useOnboardingTheme();
    const { t } = useI18n();
    return (
        <Animated.View
            pointerEvents={shown ? "auto" : "none"}
            style={[
                styles.skip,
                {
                    top,
                    opacity: shown ? 1 : 0,
                    transform: [{ translateY: shown ? 0 : -6 }],
                    transitionProperty: ["opacity", "transform"],
                    transitionDuration: [400, 600],
                    transitionTimingFunction: ["ease", EASE_SPRING],
                },
            ]}
        >
            <Pressable
                testID="onboarding-skip"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                    if (awaitingAnswer) {
                        onDecline();
                        return;
                    }
                    appHaptics.dismiss();
                    onExit();
                }}
                android_ripple={rippleConfig(colors.ink, 28)}
                style={styles.skipButton}
            >
                <Text style={[styles.skipLabel, { color: colors.muted }]}>
                    {awaitingAnswer ? t("onboarding.notifications.notNow") : t("onboarding.skip")}
                </Text>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    skip: {
        position: "absolute",
        right: 12,
        zIndex: 30,
    },
    skipButton: {
        height: 44,
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    skipLabel: {
        fontFamily: "Archivo-SemiBold",
        fontSize: 15,
    },
});
