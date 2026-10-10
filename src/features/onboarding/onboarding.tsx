import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { BackHandler, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    cancelAnimation,
    type CSSTransitionProperties,
    css,
    cubicBezier,
    interpolateColor,
    type SharedValue,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { RaisedPressable } from "@/components/elevated/raised";
import { useAppearanceStore } from "@/features/appearance/store";
import { runInterfaceTransition } from "@/features/appearance/theme-transition";
import { getEarningsColors, useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics, useOnboardingHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { onboardingSkottie } from "./art/skottie";
import { ONBOARDING_ART } from "./art/sources";
import { useArtVariants } from "./art/step-art";
import { type ArtboardPoint, CustomizeStep } from "./customize-step";
import { OnboardingHapticsContext } from "./haptics-context";
import { IntroStep } from "./intro-step";
import { type Look, OnboardingLookProvider, sameLook, useOnboardingTheme } from "./look";
import { ARTBOARD, EASE_SOFT_FN, EASE_SPRING } from "./motion";
import { OnboardingBackground, type PageId } from "./onboarding-background";
import { PagerContext } from "./pager";
import { PrivacyStep } from "./privacy-step";
import { useOnboardingStore } from "./store";
import { WidgetStep } from "./widget-step";

const PAGE_WIDTH = ARTBOARD.width;
/** A drag past this far (or flicked faster than this, in points per ms) turns the page. */
const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 0.45;
/** How much of a drag past the first or last page still moves it. */
const RUBBER_BAND = 0.3;

const EXIT_DURATION = 700;
/** The backdrop starts fading once the content has mostly gone, uncovering the app. */
const REVEAL_DELAY = 380;
const REVEAL_DURATION = 420;

const EXIT = css.keyframes({
    to: { opacity: 0, transform: [{ scale: 0.94 }] },
});
const REVEAL = css.keyframes({
    to: { opacity: 0 },
});

/** Live widgets need Android 12; elsewhere the step would promise something the app can't do. */
const HAS_WIDGETS = Platform.OS === "android" && Number(Platform.Version) >= 31;
const PAGES: PageId[] = HAS_WIDGETS ? ["intro", "widget", "privacy", "customize"] : ["intro", "privacy", "customize"];
const LAST_PAGE = PAGES.length - 1;
const CUSTOMIZE_PAGE = PAGES.indexOf("customize");

function Dot({ index, position }: { index: number; position: SharedValue<number> }) {
    const { colors } = useOnboardingTheme();
    const style = useAnimatedStyle(() => {
        const focus = Math.max(0, 1 - Math.abs(index - position.get()));
        return {
            width: 8 + 16 * focus,
            backgroundColor: interpolateColor(focus, [0, 1], [colors.track, colors.accent]),
        };
    });
    return <Animated.View style={[styles.dot, style]} />;
}

const LABEL_SWAP: CSSTransitionProperties = {
    transitionProperty: ["opacity", "transform"],
    transitionDuration: [300, 560],
    transitionTimingFunction: ["ease", EASE_SPRING],
};

/** Labels trade places in the button: the outgoing one slides away as the other slides in. */
function labelPlacement(shown: boolean, from: "above" | "below") {
    return { opacity: shown ? 1 : 0, transform: [{ translateY: shown ? 0 : from === "above" ? -18 : 18 }] };
}

/**
 * The first-launch walkthrough, drawn over the app: what the app does, the home screen
 * widget, privacy, and picking the app's look. Swipe or tap through; it fades into the app.
 */
export function Onboarding() {
    const { isDark } = useEarningsTheme();
    const palette = useAppearanceStore((state) => state.appearance.palette);
    const updateAppearance = useAppearanceStore((state) => state.update);
    const appLook = useMemo<Look>(() => ({ palette, dark: isDark }), [palette, isDark]);
    // A look the customization step is showing off, worn by the whole onboarding until it ends.
    const [preview, setPreview] = useState<Look | null>(null);
    const look = preview ?? appLook;
    const colors = getEarningsColors(look.palette, look.dark);
    const { t } = useI18n();
    const insets = useSafeAreaInsets();
    const window = useWindowDimensions();
    const reduced = useReducedMotion();
    const playHaptic = useOnboardingHaptics();
    const complete = useOnboardingStore((state) => state.complete);
    const reveal = useOnboardingStore((state) => state.reveal);

    const [step, setStep] = useState(0);
    const [visited, setVisited] = useState(() => PAGES.map((_, index) => index === 0));
    const [skipReady, setSkipReady] = useState(false);
    const [introDone, setIntroDone] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [flare, setFlare] = useState({ count: 0, big: false });
    const [introLifted, setIntroLifted] = useState(reduced);

    const position = useSharedValue(0);
    const lagging = useSharedValue(0);
    const backdrop = useSharedValue(0);
    const current = useSharedValue(0);
    const dragFrom = useSharedValue(0);
    const pager = useMemo(() => ({ position, lagging }), [position, lagging]);

    // Fit the artboard to the screen; the chrome stays clear of the system bars.
    const scale = Math.min(window.width / ARTBOARD.width, window.height / ARTBOARD.height);
    const offsetX = (window.width - ARTBOARD.width * scale) / 2;
    const offsetY = (window.height - ARTBOARD.height * scale) / 2;
    const skipTop = Math.max(34, (insets.top + 4 - offsetY) / scale);
    const footerBottom = Math.max(28, ARTBOARD.height - (window.height - insets.bottom - 8 - offsetY) / scale);
    const last = step === LAST_PAGE;

    const settleTo = (target: number) => {
        "worklet";
        current.set(target);
        position.set(withTiming(target, { duration: 780, easing: EASE_SOFT_FN }));
        lagging.set(withTiming(target, { duration: 940, easing: EASE_SOFT_FN }));
        backdrop.set(withTiming(target, { duration: 1500, easing: EASE_SOFT_FN }));
    };

    const visit = (...pages: number[]) => setVisited((seen) =>
        pages.some((page) => page >= 0 && page <= LAST_PAGE && !seen[page])
            ? seen.map((value, index) => value || pages.includes(index))
            : seen);

    const go = (target: number) => {
        const next = Math.max(0, Math.min(LAST_PAGE, target));
        if (next === step || exiting) return;
        visit(next);
        setStep(next);
        settleTo(next);
    };

    const swiped = (target: number) => {
        visit(target);
        setStep(target);
        appHaptics.selection();
    };

    const exit = () => {
        if (exiting) return;
        setExiting(true);
        reveal();
        setTimeout(complete, REVEAL_DELAY + REVEAL_DURATION);
    };

    // Looks change the way the app's theme switch does: revealed in a circle from the tap.
    const toScreen = (at: ArtboardPoint) => ({ x: offsetX + at.x * scale, y: offsetY + at.y * scale });
    const previewLook = (next: Look, at: ArtboardPoint) => {
        if (sameLook(next, look)) return;
        runInterfaceTransition(() => setPreview(sameLook(next, appLook) ? null : next), toScreen(at), reduced);
    };
    const pickLook = (next: Look, at: ArtboardPoint) => {
        runInterfaceTransition(() => {
            setPreview(null);
            // Only an explicit mode change replaces "follow the system".
            const mode = next.dark === appLook.dark ? {} : { mode: next.dark ? "dark" as const : "light" as const };
            updateAppearance({ palette: next.palette, ...mode }).catch(() => undefined);
        }, toScreen(at), reduced);
    };
    // Build the later steps' illustrations while the intro's promise is read, so turning a
    // page doesn't stall on it.
    const artVariants = useArtVariants();
    useEffect(() => {
        if (!introDone) return;
        const later = PAGES.filter((page) => page === "widget" || page === "privacy");
        const timers = later.map((page, order) => setTimeout(
            () => onboardingSkottie(ONBOARDING_ART[page](), appLook, artVariants),
            600 + order * 400,
        ));
        return () => timers.forEach(clearTimeout);
    }, [appLook, artVariants, introDone]);

    // The demo's looks were only a show: leaving the step puts the app's look back.
    const unpreview = useEffectEvent(() => {
        if (preview && !exiting) runInterfaceTransition(() => setPreview(null), { x: window.width / 2, y: window.height / 2 }, reduced);
    });
    useEffect(() => {
        if (step !== CUSTOMIZE_PAGE) unpreview();
    }, [step]);

    // Android's back steps back through the pages, and leaves the app from the first one.
    const back = useEffectEvent(() => {
        if (exiting) return true;
        if (step === 0) return false;
        go(step - 1);
        return true;
    });
    useEffect(() => {
        const subscription = BackHandler.addEventListener("hardwareBackPress", back);
        return () => subscription.remove();
    }, []);

    const pan = Gesture.Pan()
        .enabled(introDone && !exiting)
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onStart(() => {
            cancelAnimation(position);
            cancelAnimation(lagging);
            cancelAnimation(backdrop);
            dragFrom.set(position.get());
            const page = current.get();
            scheduleOnRN(visit, page - 1, page + 1);
        })
        .onUpdate((event) => {
            let next = dragFrom.get() - event.translationX / scale / PAGE_WIDTH;
            if (next < 0) next *= RUBBER_BAND;
            if (next > LAST_PAGE) next = LAST_PAGE + (next - LAST_PAGE) * RUBBER_BAND;
            position.set(next);
            lagging.set(next);
            backdrop.set(next);
        })
        .onEnd((event) => {
            const page = current.get();
            const dragged = (page - position.get()) * PAGE_WIDTH;
            const velocity = event.velocityX / scale / 1000;
            let target = page;
            if (dragged < -SWIPE_DISTANCE || velocity < -SWIPE_VELOCITY) target += 1;
            else if (dragged > SWIPE_DISTANCE || velocity > SWIPE_VELOCITY) target -= 1;
            target = Math.max(0, Math.min(LAST_PAGE, target));
            settleTo(target);
            if (target !== page) scheduleOnRN(swiped, target);
        });

    const trackStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -position.get() * PAGE_WIDTH }],
    }));

    const renderStep = (page: PageId, index: number) => {
        const playing = step === index && !exiting;
        if (page === "intro") {
            return (
                <IntroStep
                    index={index}
                    playing={playing}
                    stopped={exiting}
                    reduced={reduced}
                    onSkipReady={() => setSkipReady(true)}
                    onImpact={(big) => setFlare((value) => ({ count: value.count + 1, big }))}
                    onLift={setIntroLifted}
                    onReplay={() => setIntroDone(false)}
                    onDone={() => {
                        setIntroDone(true);
                        reveal();
                    }}
                />
            );
        }
        if (page === "widget") return <WidgetStep index={index} playing={playing} reduced={reduced} />;
        if (page === "privacy") return <PrivacyStep index={index} playing={playing} reduced={reduced} />;
        return (
            <CustomizeStep
                index={index}
                playing={playing}
                reduced={reduced}
                board={appLook}
                onPreview={previewLook}
                onPick={pickLook}
            />
        );
    };

    const footerShown = introDone && !exiting;
    const skipShown = skipReady && !last && !exiting;

    return (
        <OnboardingLookProvider look={look} artLook={appLook}>
        <StatusBar style={look.dark ? "light" : "dark"} />
        <Animated.View
            pointerEvents={exiting ? "none" : "auto"}
            style={[StyleSheet.absoluteFill, styles.overlay, exiting && {
                animationName: REVEAL,
                animationDuration: REVEAL_DURATION,
                animationDelay: REVEAL_DELAY,
                animationTimingFunction: "ease-in",
                animationFillMode: "forwards",
            }]}
        >
            <OnboardingBackground pages={PAGES} position={backdrop} flare={flare} flareLifted={introLifted} scale={scale} offsetX={offsetX} offsetY={offsetY} />
            <GestureDetector gesture={pan}>
                <View style={StyleSheet.absoluteFill}>
                    <View
                        style={[styles.artboard, {
                            transform: [{ translateX: offsetX }, { translateY: offsetY }, { scale }],
                        }]}
                    >
                        <Animated.View
                            style={[StyleSheet.absoluteFill, styles.stage, exiting && {
                                animationName: EXIT,
                                animationDuration: EXIT_DURATION,
                                animationTimingFunction: cubicBezier(0.4, 0, 0.7, 0.2),
                                animationFillMode: "forwards",
                            }]}
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
                                            {visited[index] ? renderStep(page, index) : null}
                                        </View>
                                    ))}
                                </Animated.View>
                            </PagerContext.Provider>
                            </OnboardingHapticsContext.Provider>
                        </Animated.View>

                        <Animated.View
                            pointerEvents={skipShown ? "auto" : "none"}
                            style={[styles.skip, {
                                top: skipTop,
                                opacity: skipShown ? 1 : 0,
                                transform: [{ translateY: skipShown ? 0 : -6 }],
                                transitionProperty: ["opacity", "transform"],
                                transitionDuration: [400, 600],
                                transitionTimingFunction: ["ease", EASE_SPRING],
                            }]}
                        >
                            <Pressable
                                testID="onboarding-skip"
                                accessibilityRole="button"
                                hitSlop={8}
                                onPress={() => {
                                    appHaptics.dismiss();
                                    exit();
                                }}
                                style={styles.skipButton}
                            >
                                <Text style={[styles.skipLabel, { color: colors.muted }]}>{t("onboarding.skip")}</Text>
                            </Pressable>
                        </Animated.View>

                        <Animated.View
                            pointerEvents={footerShown ? "box-none" : "none"}
                            style={[styles.footer, {
                                bottom: footerBottom,
                                opacity: footerShown ? 1 : 0,
                                transform: [{ translateY: footerShown ? 0 : 28 }],
                                transitionProperty: ["opacity", "transform"],
                                transitionDuration: [500, 900],
                                transitionTimingFunction: ["ease", EASE_SPRING],
                            }]}
                        >
                            <View
                                accessible
                                accessibilityRole="progressbar"
                                accessibilityLabel={t("onboarding.step", { step: step + 1, count: PAGES.length })}
                                style={styles.dots}
                            >
                                {PAGES.map((page, index) => <Dot key={page} index={index} position={position} />)}
                            </View>
                            <RaisedPressable
                                testID="onboarding-continue"
                                accessibilityRole="button"
                                accessibilityLabel={last ? t("onboarding.getStarted") : t("onboarding.continue")}
                                onPress={() => {
                                    if (last) {
                                        appHaptics.primaryAction();
                                        exit();
                                    } else {
                                        go(step + 1);
                                    }
                                }}
                                surface={{ face: colors.accent, edge: colors.edgeAccent }}
                                depth={4}
                                radius={17}
                                containerStyle={styles.primaryContainer}
                                style={styles.primary}
                            >
                                <Animated.Text style={[styles.primaryLabel, { color: colors.ink }, LABEL_SWAP, labelPlacement(!last, "above")]}>
                                    {t("onboarding.continue")}
                                </Animated.Text>
                                <Animated.Text style={[styles.primaryLabel, { color: colors.ink }, LABEL_SWAP, labelPlacement(last, "below")]}>
                                    {t("onboarding.getStarted")}
                                </Animated.Text>
                            </RaisedPressable>
                        </Animated.View>
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
    dot: {
        height: 8,
        borderRadius: 4,
    },
    primaryContainer: {
        alignSelf: "stretch",
    },
    primary: {
        height: 54,
        overflow: "hidden",
    },
    primaryLabel: {
        ...StyleSheet.absoluteFill,
        textAlign: "center",
        textAlignVertical: "center",
        lineHeight: 52,
        fontFamily: "Archivo-SemiBold",
        fontSize: 15.5,
    },
});
