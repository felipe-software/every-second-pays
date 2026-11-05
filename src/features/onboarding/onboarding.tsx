import { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { css, useAnimatedStyle, useReducedMotion } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppearanceStore } from "@/features/appearance/store";
import { useEarningsTheme } from "@/features/earnings/theme";
import { useOnboardingHaptics } from "@/features/haptics/haptics";

import { fitArtboard } from "./artboard-fit";
import { type Look, OnboardingLookProvider } from "./look";
import { ARTBOARD } from "./motion";
import { OnboardingBackground } from "./onboarding-background";
import { OnboardingFooter } from "./onboarding-footer";
import { LAST_PAGE, NOTIFICATIONS_PAGE, PAGE_WIDTH, PAGES } from "./onboarding-pages";
import { OnboardingSkip } from "./onboarding-skip";
import { OnboardingStage } from "./onboarding-stage";
import { useIntroProgress } from "./use-intro-progress";
import { useLookPreview } from "./use-look-preview";
import { useNotificationAnswer } from "./use-notification-answer";
import { REVEAL_DELAY, REVEAL_DURATION, useOnboardingExit } from "./use-onboarding-exit";
import { useBackThroughPages, useOnboardingPager } from "./use-onboarding-pager";
import { usePrebuiltArt } from "./use-prebuilt-art";

const REVEAL = css.keyframes({
    to: { opacity: 0 },
});

export function Onboarding() {
    const { isDark } = useEarningsTheme();
    const palette = useAppearanceStore((state) => state.appearance.palette);
    const updateAppearance = useAppearanceStore((state) => state.update);
    const appLook = useMemo<Look>(() => ({ palette, dark: isDark }), [palette, isDark]);
    const insets = useSafeAreaInsets();
    const window = useWindowDimensions();
    const reduced = useReducedMotion();
    const playHaptic = useOnboardingHaptics();
    const { exiting, exit, reveal } = useOnboardingExit();
    const { skipReady, introDone, flare, introLifted, introEvents } = useIntroProgress(reduced, reveal);
    const fit = fitArtboard(window, insets);
    const { scale, offsetX, offsetY } = fit;
    const { step, visited, position, backdrop, pager, go, pan } = useOnboardingPager({ exiting, introDone, scale });
    const { notifications, askingSystem, askForNotifications, declineNotifications } = useNotificationAnswer();
    const { look, artLook, previewLook, pickLook } = useLookPreview({
        appLook,
        updateAppearance,
        step,
        exiting,
        reduced,
        window,
        fit,
    });
    usePrebuiltArt(artLook, introDone);
    useBackThroughPages({ exiting, step, go });
    const trackStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -position.get() * PAGE_WIDTH }],
    }));

    const last = step === LAST_PAGE;
    const onNotificationsPage = step === NOTIFICATIONS_PAGE;
    const awaitingAnswer = onNotificationsPage && notifications === "ask";
    const footerShown = introDone && !exiting;
    const skipShown = skipReady && !last && !exiting && (!onNotificationsPage || awaitingAnswer);

    return (
        <OnboardingLookProvider look={look} artLook={artLook}>
            <StatusBar style={look.dark ? "light" : "dark"} />
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    styles.overlay,
                    exiting && {
                        animationName: REVEAL,
                        animationDuration: REVEAL_DURATION,
                        animationDelay: REVEAL_DELAY,
                        animationTimingFunction: "ease-in",
                        animationFillMode: "forwards",
                    },
                ]}
            >
                <OnboardingBackground
                    pages={PAGES}
                    position={backdrop}
                    flare={flare}
                    flareLifted={introLifted}
                    scale={scale}
                    offsetX={offsetX}
                    offsetY={offsetY}
                />
                <GestureDetector gesture={pan}>
                    <View pointerEvents={exiting ? "none" : "auto"} style={StyleSheet.absoluteFill}>
                        <View
                            style={[
                                styles.artboard,
                                {
                                    transform: [{ translateX: offsetX }, { translateY: offsetY }, { scale }],
                                },
                            ]}
                        >
                            <OnboardingStage
                                exiting={exiting}
                                playHaptic={playHaptic}
                                pager={pager}
                                trackStyle={trackStyle}
                                step={step}
                                visited={visited}
                                reduced={reduced}
                                introEvents={introEvents}
                                askingSystem={askingSystem}
                                notifications={notifications}
                                board={appLook}
                                onPreview={previewLook}
                                onPick={pickLook}
                            />

                            <OnboardingSkip
                                shown={skipShown}
                                top={fit.skipTop}
                                awaitingAnswer={awaitingAnswer}
                                onDecline={declineNotifications}
                                onExit={exit}
                            />

                            <OnboardingFooter
                                shown={footerShown}
                                bottom={fit.footerBottom}
                                step={step}
                                last={last}
                                awaitingAnswer={awaitingAnswer}
                                position={position}
                                onAllow={askForNotifications}
                                onExit={exit}
                                onGo={go}
                            />
                        </View>
                    </View>
                </GestureDetector>
            </Animated.View>
        </OnboardingLookProvider>
    );
}

const styles = StyleSheet.create({
    overlay: {
        zIndex: 100,
    },
    artboard: {
        position: "absolute",
        left: 0,
        top: 0,
        width: ARTBOARD.width,
        height: ARTBOARD.height,
        transformOrigin: "0% 0%",
    },
});
