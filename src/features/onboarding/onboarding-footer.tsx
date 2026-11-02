import { StyleSheet, View } from "react-native";
import Animated, { type CSSTransitionProperties, type SharedValue } from "react-native-reanimated";

import { PrimaryButton } from "@/components/elevated/primary-button";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { useOnboardingTheme } from "./look";
import { EASE_SPRING } from "./motion";
import { OnboardingPageDot } from "./onboarding-page-dot";
import { PAGES } from "./onboarding-pages";

const LABEL_SWAP: CSSTransitionProperties = {
    transitionProperty: ["opacity", "transform"],
    transitionDuration: [300, 560],
    transitionTimingFunction: ["ease", EASE_SPRING],
};

function labelPlacement(shown: boolean, from: "above" | "below") {
    const hiddenOffset = from === "above" ? -18 : 18;
    return { opacity: shown ? 1 : 0, transform: [{ translateY: shown ? 0 : hiddenOffset }] };
}

function primaryActionFor(awaitingAnswer: boolean, last: boolean) {
    if (awaitingAnswer) return "allow";
    return last ? "start" : "continue";
}

type OnboardingFooterProps = {
    shown: boolean;
    bottom: number;
    step: number;
    last: boolean;
    awaitingAnswer: boolean;
    position: SharedValue<number>;
    onAllow: () => Promise<void>;
    onExit: () => void;
    onGo: (target: number) => void;
};

export function OnboardingFooter({
    shown,
    bottom,
    step,
    last,
    awaitingAnswer,
    position,
    onAllow,
    onExit,
    onGo,
}: OnboardingFooterProps) {
    const { colors } = useOnboardingTheme();
    const { t } = useI18n();
    const primaryAction = primaryActionFor(awaitingAnswer, last);
    const primaryLabel = {
        allow: t("onboarding.notifications.allow"),
        start: t("onboarding.getStarted"),
        continue: t("onboarding.continue"),
    }[primaryAction];

    return (
        <Animated.View
            pointerEvents={shown ? "box-none" : "none"}
            style={[
                styles.footer,
                {
                    bottom,
                    opacity: shown ? 1 : 0,
                    transform: [{ translateY: shown ? 0 : 28 }],
                    transitionProperty: ["opacity", "transform"],
                    transitionDuration: [500, 900],
                    transitionTimingFunction: ["ease", EASE_SPRING],
                },
            ]}
        >
            <View
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={t("onboarding.step", { step: step + 1, count: PAGES.length })}
                style={styles.dots}
            >
                {PAGES.map((page, index) => (
                    <OnboardingPageDot key={page} index={index} position={position} />
                ))}
            </View>
            <PrimaryButton
                testID="onboarding-continue"
                accessibilityLabel={primaryLabel}
                colors={colors}
                style={styles.primary}
                onPress={() => {
                    if (primaryAction === "allow") {
                        void onAllow();
                    } else if (last) {
                        appHaptics.primaryAction();
                        onExit();
                    } else {
                        onGo(step + 1);
                    }
                }}
                label={(textStyle) => (
                    <>
                        <Animated.Text
                            style={[
                                styles.primaryLabel,
                                textStyle,
                                LABEL_SWAP,
                                labelPlacement(primaryAction === "continue", "above"),
                            ]}
                        >
                            {t("onboarding.continue")}
                        </Animated.Text>
                        <Animated.Text
                            style={[
                                styles.primaryLabel,
                                textStyle,
                                LABEL_SWAP,
                                labelPlacement(primaryAction === "allow", "below"),
                            ]}
                        >
                            {t("onboarding.notifications.allow")}
                        </Animated.Text>
                        <Animated.Text
                            style={[
                                styles.primaryLabel,
                                textStyle,
                                LABEL_SWAP,
                                labelPlacement(primaryAction === "start", "below"),
                            ]}
                        >
                            {t("onboarding.getStarted")}
                        </Animated.Text>
                    </>
                )}
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    footer: {
        position: "absolute",
        left: 24,
        right: 24,
        zIndex: 30,
        alignItems: "center",
    },
    dots: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 22,
    },
    primary: {
        overflow: "hidden",
    },
    primaryLabel: {
        ...StyleSheet.absoluteFill,
        textAlign: "center",
        textAlignVertical: "center",
        lineHeight: 54,
        fontFamily: "Archivo-Bold",
        fontSize: 16,
    },
});
