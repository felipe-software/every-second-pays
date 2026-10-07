import { Image } from "expo-image";
import { NumberFlow } from "number-flow-react-native";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    cancelAnimation,
    Easing,
    type EntryExitAnimationFunction,
    Extrapolation,
    FadeOutUp,
    interpolate,
    ReduceMotion,
    type SharedValue,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import { useEarningsTheme } from "@/features/earnings/theme";
import { useMoneyLandingHaptic } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { StepCopy } from "./step-copy";

type Stage = { period: "day" | "week" | "month" | "year"; amount: number };

// An illustration, not a real salary: round numbers that grow with each period.
const STAGES: readonly Stage[] = [
    { period: "day", amount: 160 },
    { period: "week", amount: 800 },
    { period: "month", amount: 3500 },
    { period: "year", amount: 42000 },
];

const PERIOD_KEYS: Record<Stage["period"], TranslationKey> = {
    day: "onboarding.period.day",
    week: "onboarding.period.week",
    month: "onboarding.period.month",
    year: "onboarding.period.year",
};

const FLIGHT_DURATION = 1550;
const WAVE_SPREAD = 620;
const INTRO_START = 450;
const INTRO_INTERVAL = 1900;
const LOOP_INTERVAL = 2700;
const INTRO_NOTES = 24;
const LOOP_NOTES = 14;
/** Waves overlap while the last one lands; older ones have finished by then. */
const MAX_WAVES = 3;
/** The share of the flight after which the first bills reach the counter. */
const FIRST_LANDING = 0.86;
const COUNTER_SIZE = 82;

type Note = {
    id: number;
    delay: number;
    size: number;
    x0: number; y0: number;
    x1: number; y1: number;
    x2: number; y2: number;
    x3: number; y3: number;
    r0: number; r1: number; r2: number;
    mirrorX: 1 | -1;
};

type Wave = { id: number; notes: Note[] };

function between(min: number, max: number) {
    return min + Math.random() * (max - min);
}

/**
 * Bills rise from below the screen in a wave, crest near the top, and dive into the counter.
 * Each bill follows a cubic Bézier: straight up, over the crest, down onto the number.
 */
function createWave(
    id: number,
    count: number,
    direction: 1 | -1,
    area: { width: number; height: number; crestTop: number; targetX: number; targetY: number },
): Wave {
    const lane = area.width / count;
    const phase = between(0, Math.PI * 2);
    const notes = Array.from({ length: count }, (_, index): Note => {
        const order = direction === 1 ? index : count - 1 - index;
        const x0 = lane * (index + 0.5) + between(-lane * 0.4, lane * 0.4);
        const crest = area.crestTop + 70 * (0.5 + 0.5 * Math.sin(phase + (index / count) * Math.PI * 2)) + between(0, 30);
        const r0 = between(-55, 55);
        return {
            id: index,
            delay: (order / count) * WAVE_SPREAD + between(0, 90),
            size: between(84, 136),
            x0,
            y0: area.height + between(70, 140),
            x1: x0 + between(-36, 36),
            y1: crest - 30,
            x2: x0 + (area.targetX - x0) * 0.55 + between(-44, 44),
            y2: crest - 100,
            x3: area.targetX + between(-16, 16),
            y3: area.targetY + between(-8, 8),
            r0,
            r1: r0 + between(-110, 110),
            r2: between(-16, 16),
            mirrorX: Math.random() < 0.5 ? -1 : 1,
        };
    });
    return { id, notes };
}

const FlyingNote = memo(function FlyingNote({ note }: { note: Note }) {
    const t = useSharedValue(0);
    const style = useAnimatedStyle(() => {
        const p = t.get();
        const q = 1 - p;
        const a = q * q * q;
        const b = 3 * q * q * p;
        const c = 3 * q * p * p;
        const d = p * p * p;
        return {
            opacity: interpolate(p, [0, 0.05, 0.9, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
            transform: [
                { translateX: a * note.x0 + b * note.x1 + c * note.x2 + d * note.x3 },
                { translateY: a * note.y0 + b * note.y1 + c * note.y2 + d * note.y3 },
                { rotateZ: `${interpolate(p, [0, 0.5, 1], [note.r0, note.r1, note.r2], Extrapolation.CLAMP)}deg` },
                { scale: interpolate(p, [0, 0.4, 0.8, 1], [0.6, 1.15, 0.95, 0.25], Extrapolation.CLAMP) },
                { scaleX: note.mirrorX },
            ],
        };
    });

    useEffect(() => {
        t.set(withDelay(
            note.delay,
            withTiming(1, { duration: FLIGHT_DURATION, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }),
            ReduceMotion.System,
        ));
        return () => cancelAnimation(t);
    }, [note.delay, t]);

    return (
        <Animated.View
            style={[
                styles.note,
                { width: note.size, height: note.size, marginLeft: note.size / -2, marginTop: note.size / -2 },
                style,
            ]}
        >
            <Image
                source={require("@/assets/images/android-icon-foreground.png")}
                contentFit="contain"
                cachePolicy="memory"
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
    );
});

const LETTER_SPRING = { damping: 11, stiffness: 210, mass: 0.7, reduceMotion: ReduceMotion.System };

function letterEntering(index: number): EntryExitAnimationFunction {
    const delay = index * 32;
    const tilt = index % 2 === 0 ? -14 : 12;
    return () => {
        "worklet";
        return {
            initialValues: {
                opacity: 0,
                transform: [{ translateY: 30 }, { rotateZ: `${tilt}deg` }, { scale: 0.55 }],
            },
            animations: {
                opacity: withDelay(delay, withTiming(1, { duration: 200, reduceMotion: ReduceMotion.System })),
                transform: [
                    { translateY: withDelay(delay, withSpring(0, LETTER_SPRING)) },
                    { rotateZ: withDelay(delay, withSpring("0deg", LETTER_SPRING)) },
                    { scale: withDelay(delay, withSpring(1, LETTER_SPRING)) },
                ],
            },
        };
    };
}

/** The period under the counter: the old word floats away while the new one drops in letter by letter. */
function PeriodWord({ word, color }: { word: string; color: string }) {
    return (
        <View style={styles.wordStage}>
            <Animated.View key={word} exiting={FadeOutUp.duration(220)} style={styles.word}>
                {Array.from(word).map((letter, index) => (
                    <Animated.Text
                        // Letters repeat ("week"), so the position is part of the key.
                        key={`${letter}-${index}`}
                        entering={letterEntering(index)}
                        style={[styles.letter, { color }]}
                    >
                        {letter === " " ? " " : letter}
                    </Animated.Text>
                ))}
            </Animated.View>
        </View>
    );
}

/**
 * Step one: a sample income growing period by period while waves of bills pour into it.
 * The first pass through the periods is the intro; `onIntroDone` fires when it lands on the year.
 */
export function MoneyWaveStep({
    active,
    width,
    height,
    pulse,
    onIntroDone,
}: {
    active: boolean;
    width: number;
    height: number;
    pulse: SharedValue<number>;
    onIntroDone: () => void;
}) {
    const { colors } = useEarningsTheme();
    const { t, locale } = useI18n();
    const insets = useSafeAreaInsets();
    const reduceMotion = useReducedMotion();
    const playLanding = useMoneyLandingHaptic();
    const [stage, setStage] = useState(-1);
    const [amount, setAmount] = useState(0);
    const [waves, setWaves] = useState<Wave[]>([]);
    const [showCopy, setShowCopy] = useState(false);
    const introDone = useRef(false);
    const nextStage = useRef(0);
    const nextWaveId = useRef(0);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const counterScale = useSharedValue(1);
    const counterStyle = useAnimatedStyle(() => ({ transform: [{ scale: counterScale.get() }] }));

    const counterTop = insets.top + height * 0.17;
    const target = { x: width / 2, y: counterTop + 48 };

    const later = useCallback((ms: number, run: () => void) => {
        timers.current.push(setTimeout(run, ms));
    }, []);

    const land = useCallback(() => {
        cancelAnimation(counterScale);
        counterScale.set(withSequence(
            ReduceMotion.System,
            withTiming(1.12, { duration: 110, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System }),
            withSpring(1, { damping: 9, mass: 0.6, stiffness: 210, reduceMotion: ReduceMotion.System }),
        ));
        cancelAnimation(pulse);
        pulse.set(withSequence(
            ReduceMotion.System,
            withTiming(1, { duration: 140, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System }),
            withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }),
        ));
        for (let tap = 0; tap < 6; tap += 1) later(tap * 70, playLanding);
    }, [counterScale, later, playLanding, pulse]);

    const playStage = useCallback((index: number, notes: number) => {
        const next = STAGES[index];
        setStage(index);
        if (reduceMotion) {
            setAmount(next.amount);
            return;
        }
        const id = nextWaveId.current++;
        const wave = createWave(id, notes, id % 2 === 0 ? 1 : -1, {
            width,
            height,
            crestTop: insets.top + 40,
            targetX: target.x,
            targetY: target.y,
        });
        setWaves((current) => [...current.slice(1 - MAX_WAVES), wave]);
        const firstLanding = FLIGHT_DURATION * FIRST_LANDING;
        later(firstLanding - 120, () => setAmount(next.amount));
        later(firstLanding, land);
    }, [height, insets.top, land, later, reduceMotion, target.x, target.y, width]);

    // The sequence keeps running across re-renders; it reads the latest callbacks through refs
    // so a new haptics or layout callback never restarts it (which would drop pending landings).
    const playStageRef = useRef(playStage);
    const onIntroDoneRef = useRef(onIntroDone);
    useLayoutEffect(() => {
        playStageRef.current = playStage;
        onIntroDoneRef.current = onIntroDone;
    });

    useEffect(() => {
        if (!active || width <= 0) return;

        const run = (delay: number) => {
            later(delay, () => {
                const index = nextStage.current;
                nextStage.current = (index + 1) % STAGES.length;
                const intro = !introDone.current;
                playStageRef.current(index, intro ? INTRO_NOTES : LOOP_NOTES);

                if (intro && index >= 1) later(FLIGHT_DURATION, () => setShowCopy(true));
                if (intro && index === STAGES.length - 1) {
                    introDone.current = true;
                    later(FLIGHT_DURATION, () => onIntroDoneRef.current());
                }
                run(introDone.current ? LOOP_INTERVAL : INTRO_INTERVAL);
            });
        };
        if (introDone.current) {
            setShowCopy(true);
            onIntroDoneRef.current();
        }
        run(introDone.current ? 300 : INTRO_START);

        const pending = timers.current;
        return () => {
            pending.forEach(clearTimeout);
            pending.length = 0;
        };
    }, [active, later, width]);

    useEffect(() => () => {
        cancelAnimation(counterScale);
    }, [counterScale]);

    const word = stage < 0 ? "" : t(PERIOD_KEYS[STAGES[stage].period]);
    const wholeStyle = {
        color: colors.ink,
        fontFamily: "Archivo-Bold",
        fontSize: COUNTER_SIZE,
        fontWeight: "700" as const,
        letterSpacing: -COUNTER_SIZE * 0.05,
    };

    return (
        <View style={{ width, height }}>
            <View
                className="absolute left-0 right-0 items-center"
                style={{ top: counterTop, zIndex: 1 }}
                accessible
                accessibilityLabel={stage < 0 ? undefined : t("onboarding.money.sampleAccessibility", {
                    amount: `$${amount.toLocaleString(locale)}`,
                    period: word,
                })}
            >
                <Animated.View style={[styles.counter, counterStyle]}>
                    <Text className="mr-1 font-sans text-[34px] font-medium text-muted">$</Text>
                    <NumberFlow
                        value={amount}
                        locales={locale}
                        format={{ maximumFractionDigits: 0 }}
                        continuous
                        mask
                        style={wholeStyle}
                    />
                </Animated.View>
                <PeriodWord word={word} color={colors.accentDeep} />
            </View>

            <View className="absolute left-0 right-0" style={{ top: counterTop + 200 }}>
                {showCopy ? <StepCopy title={t("onboarding.money.title")} body={t("onboarding.money.body")} /> : null}
            </View>

            <View
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[StyleSheet.absoluteFill, { zIndex: 2 }]}
            >
                {waves.flatMap((wave) => wave.notes.map((note) => (
                    <FlyingNote key={`${wave.id}-${note.id}`} note={note} />
                )))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    counter: {
        height: 96,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    note: {
        position: "absolute",
        left: 0,
        top: 0,
    },
    wordStage: {
        height: 44,
        alignSelf: "stretch",
        marginTop: 4,
    },
    word: {
        ...StyleSheet.absoluteFill,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    letter: {
        fontFamily: "Archivo-SemiBold",
        fontSize: 30,
        letterSpacing: -0.6,
    },
});
