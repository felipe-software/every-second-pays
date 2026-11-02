import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle, css, cubicBezier } from "react-native-reanimated";

import { OnboardingHapticsContext, type PlayHaptic } from "./haptics-context";
import { OnboardingPage, type OnboardingPageProps } from "./onboarding-page";
import { PAGE_WIDTH, PAGES } from "./onboarding-pages";
import { PagerContext, type PagerContextValue } from "./pager";

const EXIT_DURATION = 700;

const EXIT = css.keyframes({
    to: { opacity: 0, transform: [{ scale: 0.94 }] },
});

type OnboardingStageProps = Omit<OnboardingPageProps, "page" | "index" | "playing"> & {
    exiting: boolean;
    playHaptic: PlayHaptic;
    pager: PagerContextValue;
    trackStyle: StyleProp<AnimatedStyle<ViewStyle>>;
    step: number;
    visited: boolean[];
};

export function OnboardingStage({
    exiting,
    playHaptic,
    pager,
    trackStyle,
    step,
    visited,
    ...pageProps
}: OnboardingStageProps) {
    return (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                styles.stage,
                exiting && {
                    animationName: EXIT,
                    animationDuration: EXIT_DURATION,
                    animationTimingFunction: cubicBezier(0.4, 0, 0.7, 0.2),
                    animationFillMode: "forwards",
                },
            ]}
        >
            <OnboardingHapticsContext.Provider value={playHaptic}>
                <PagerContext.Provider value={pager}>
                    <Animated.View style={[styles.track, { width: PAGE_WIDTH * PAGES.length }, trackStyle]}>
                        {PAGES.map((page, index) => (
                            <View
                                key={page}
                                accessibilityElementsHidden={index !== step}
                                importantForAccessibility={index === step ? "auto" : "no-hide-descendants"}
                                pointerEvents={index === step ? "box-none" : "none"}
                                style={[styles.page, { left: index * PAGE_WIDTH }]}
                            >
                                {visited[index] ? (
                                    <OnboardingPage
                                        page={page}
                                        index={index}
                                        playing={step === index && !exiting}
                                        {...pageProps}
                                    />
                                ) : null}
                            </View>
                        ))}
                    </Animated.View>
                </PagerContext.Provider>
            </OnboardingHapticsContext.Provider>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    stage: {
        transformOrigin: "50% 40%",
    },
    track: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
    },
    page: {
        position: "absolute",
        top: 0,
        bottom: 0,
        width: PAGE_WIDTH,
    },
});
