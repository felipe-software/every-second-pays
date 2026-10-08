import { useEffect, useEffectEvent } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
    css,
    Easing,
    ReduceMotion,
    useAnimatedProps,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { useI18n } from "@/features/i18n/i18n";

import { ONBOARDING_ART } from "./art/sources";
import { StepArt } from "./art/step-art";
import { useOnboardingHaptic } from "./haptics-context";
import { useOnboardingTheme } from "./look";
import { EASE_BOUNCY, FADE_IN, rise } from "./motion";
import { DEPTH, PageLayer } from "./pager";
import { StepCopy } from "./step-copy";

const ROWS = [
    { key: "onboarding.privacy.noAccount", rise: 1440, pop: 1580, draw: 1700 },
    { key: "onboarding.privacy.noTracking", rise: 1540, pop: 1680, draw: 1800 },
    { key: "onboarding.privacy.onDevice", rise: 1640, pop: 1780, draw: 1900 },
] as const;

const POP = css.keyframes({
    from: { transform: [{ scale: 0.35 }] },
    to: { transform: [{ scale: 1 }] },
});

const AnimatedPath = Animated.createAnimatedComponent(Path);
// The check's two strokes: (20,6)→(9,17) and (9,17)→(4,12).
const CHECK_LENGTH = Math.hypot(11, 11) + Math.hypot(5, 5);

function Check({ delay }: { delay: number }) {
    const { colors } = useOnboardingTheme();
    const drawn = useSharedValue(0);
    const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - drawn.get()) }));

    useEffect(() => {
        drawn.set(withDelay(delay, withTiming(1, {
            duration: 380,
            easing: Easing.bezier(0.6, 0, 0.3, 1),
            reduceMotion: ReduceMotion.System,
        })));
    }, [delay, drawn]);

    return (
        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
            <AnimatedPath
                d="M20 6 9 17l-5-5"
                stroke={colors.ink}
                strokeWidth={3.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={CHECK_LENGTH}
                animatedProps={animatedProps}
            />
        </Svg>
    );
}

function PromiseRow({ label, row }: { label: string; row: typeof ROWS[number] }) {
    const { colors } = useOnboardingTheme();
    return (
        <Animated.View style={[styles.rowShell, rise(row.rise, 18)]}>
            <View style={[styles.rowEdge, { backgroundColor: colors.edgeFill }]} />
            <View style={[styles.row, { backgroundColor: colors.fill, borderColor: colors.edgeFill }]}>
                <Animated.View
                    style={[styles.checkDisc, {
                        backgroundColor: colors.accent,
                        animationName: [POP, FADE_IN],
                        animationDuration: [640, 200],
                        animationTimingFunction: [EASE_BOUNCY, "ease-out"],
                        animationDelay: row.pop,
                        animationFillMode: "both",
                    }]}
                >
                    <Check delay={row.draw} />
                </Animated.View>
                <Text style={[styles.rowLabel, { color: colors.ink }]}>{label}</Text>
            </View>
        </Animated.View>
    );
}

/** Step three: a padlock snaps shut over the app's privacy promises. */
export function PrivacyStep({ index, playing, reduced }: { index: number; playing: boolean; reduced: boolean }) {
    const { t } = useI18n();
    const art = ONBOARDING_ART.privacy();
    const haptic = useOnboardingHaptic();
    const tick = useEffectEvent(() => {
        if (playing) haptic("tick");
    });

    useEffect(() => {
        const timers = ROWS.map((row) => setTimeout(tick, row.pop));
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <>
            <PageLayer index={index} depth={DEPTH.art} passThrough>
                <StepArt
                    source={art}
                    intro="intro"
                    loop="loop"
                    playing={playing}
                    reduced={reduced}
                    cues={art.cues}
                    onCue={(cue) => {
                        if (cue === "lock" && playing) haptic("lock");
                    }}
                />
            </PageLayer>
            <PageLayer index={index} depth={DEPTH.copy}>
                <StepCopy
                    top={378}
                    title={t("onboarding.privacy.title")}
                    body={t("onboarding.privacy.body")}
                    titleDelay={240}
                    bodyDelay={460}
                />
                <View style={styles.rows}>
                    {ROWS.map((row) => <PromiseRow key={row.key} label={t(row.key)} row={row} />)}
                </View>
            </PageLayer>
        </>
    );
}

const styles = StyleSheet.create({
    rows: {
        position: "absolute",
        left: 44,
        right: 44,
        top: 494,
        gap: 8,
    },
    rowShell: {
        paddingBottom: 4,
    },
    rowEdge: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 3,
        bottom: 1,
        borderRadius: 15,
    },
    row: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 15,
        borderWidth: 1,
    },
    checkDisc: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    rowLabel: {
        flexShrink: 1,
        fontFamily: "Archivo-SemiBold",
        fontSize: 15,
    },
});
