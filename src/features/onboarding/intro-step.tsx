import { useEffect, useEffectEvent, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useDerivedValue, useSharedValue } from "react-native-reanimated";

import { useScoreHaptic } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { introCounter, introWords, ONBOARDING_ART } from "./art/sources";
import { FPS, StepArt } from "./art/step-art";
import { INTRO_HAPTICS, INTRO_HAPTICS_AT } from "./intro-haptics";
import { IntroLabels } from "./intro-labels";
import { artShift, DAY_PAY, introDrop, LIFT, MONTH_PAY, type Stage, STORY, YEAR_PAY } from "./intro-timeline";
import { DEPTH, PageLayer } from "./pager";
import { StepCopy } from "./step-copy";

type Period = "day" | "week" | "month" | "year";

const PERIOD_KEYS = {
    day: "onboarding.perDay",
    week: "onboarding.perWeek",
    month: "onboarding.perMonth",
    year: "onboarding.perYear",
} as const;

/** What the example wage adds up to over each period: a week is its five workdays. */
const PERIOD_PAY: Record<Period, number> = { day: DAY_PAY, week: DAY_PAY * 5, month: MONTH_PAY, year: YEAR_PAY };

type Beat =
    | { type: "stage"; stage: Stage }
    | { type: "ready" | "haptics" | "lift" | "copy" | "done" }
    | { type: "total"; period: Period };

// On the illustration's own frames rather than timers, so a busy JS thread can't put the story
// out of step with what's drawn.
const INTRO_BEATS: [time: number, beat: Beat][] = [
    [420, { type: "stage", stage: 1 }],
    [700, { type: "ready" }],
    [INTRO_HAPTICS_AT, { type: "haptics" }],
    [STORY.day, { type: "total", period: "day" }],
    [STORY.week, { type: "stage", stage: 2 }],
    [STORY.weekTotal, { type: "total", period: "week" }],
    [STORY.month, { type: "stage", stage: 3 }],
    [STORY.monthTotal, { type: "total", period: "month" }],
    [STORY.year, { type: "stage", stage: 4 }],
    [STORY.finale, { type: "total", period: "year" }],
    [STORY.finale + LIFT.delay, { type: "lift" }],
    // The promise comes in while the story is still rising into place.
    [STORY.finale + LIFT.delay + 200, { type: "copy" }],
    [STORY.finale + LIFT.delay + 600, { type: "done" }],
];

type IntroState = {
    stage: Stage;
    /** The period whose total has landed in the counter, for screen readers. */
    landed: Period | null;
    /** The story is over and everything telling it has risen into its place. */
    lifted: boolean;
    copyIn: boolean;
    /** Played through once, so a tap on the illustration can play it again. */
    done: boolean;
};

const START: IntroState = { stage: 0, landed: null, lifted: false, copyIn: false, done: false };

/** The end of the intro without the build-up: a year's pile of cash, for reduced motion. */
const SETTLED: IntroState = { stage: 4, landed: "year", lifted: true, copyIn: true, done: true };

/** Playing it again clears the screen for the story, as the first time; the promise returns at its end. */
const REPLAY: IntroState = { ...START, done: true };

/**
 * Step one: an example wage adding up from a day of hours to a year of cash, each period
 * zooming out of the last, then the app's promise. The illustration, the total and its period
 * are the design's own animations, the words in the reader's language and number format; the
 * hour labels and day letters are drawn here on the same timeline. Once it has played, a tap on
 * the illustration plays it again.
 */
export function IntroStep({
    index,
    playing,
    reduced,
    onSkipReady,
    onImpact,
    onLift,
    onReplay,
    onDone,
}: {
    index: number;
    /** On screen, so the illustration runs. */
    playing: boolean;
    reduced: boolean;
    onSkipReady: () => void;
    onImpact: (big: boolean) => void;
    /** Whether the story's layers are in their place, for the ones drawn elsewhere (the flare). */
    onLift: (lifted: boolean) => void;
    /** Playing again from the start, so the footer goes until `onDone`. */
    onReplay: () => void;
    /** The story has played and the promise is in; again after each replay. */
    onDone: () => void;
}) {
    const { t, language, formatNumber } = useI18n();
    const art = ONBOARDING_ART.intro();
    const counter = introCounter(formatNumber);
    const words = introWords(language);
    const [state, setState] = useState(reduced ? SETTLED : START);
    const [replays, setReplays] = useState(0);
    const haptics = useScoreHaptic(INTRO_HAPTICS);
    const [storyStart] = art.segments.story;
    const frame = useSharedValue(reduced ? art.segments.ambient[0] : storyStart);
    const artShifted = useDerivedValue(() => artShift(((frame.get() - storyStart) * 1000) / FPS));

    const ready = useEffectEvent(onSkipReady);
    const finish = useEffectEvent(onDone);

    useEffect(() => {
        if (!reduced) return;
        ready();
        finish();
    }, [reduced]);

    const stopHaptics = useEffectEvent(haptics.stop);
    useEffect(() => {
        if (playing) return () => stopHaptics();
    }, [playing]);

    const update = (change: Partial<IntroState>) => setState((current) => ({ ...current, ...change }));
    const play = (beat: Beat, late: number) => {
        switch (beat.type) {
            case "stage":
                return update({ stage: beat.stage });
            case "ready":
                if (replays === 0) onSkipReady();
                return;
            case "haptics":
                return haptics.play(late);
            case "total":
                update({ landed: beat.period });
                return onImpact(beat.period === "year");
            case "lift":
                update({ lifted: true });
                return onLift(true);
            case "copy":
                return update({ copyIn: true });
            case "done":
                update({ done: true });
                return onDone();
        }
    };
    const cues = INTRO_BEATS.map(([time], index) => ({ frame: storyStart + (time * FPS) / 1000, name: String(index) }));

    const replay = () => {
        setState(REPLAY);
        onLift(false);
        onReplay();
        setReplays((count) => count + 1);
    };

    const landed = state.landed;

    return (
        <>
            <PageLayer index={index} depth={DEPTH.art} zIndex={1} passThrough>
                <Animated.View style={[StyleSheet.absoluteFill, introDrop(state.lifted)]}>
                    <StepArt
                        source={art}
                        overlays={[counter, words]}
                        intro="story"
                        loop="ambient"
                        playing={playing}
                        reduced={reduced}
                        replay={replays}
                        frame={frame}
                        cues={cues}
                        onCue={(name, late) => play(INTRO_BEATS[Number(name)][1], late)}
                    />
                    <IntroLabels stage={state.stage} shift={artShifted} />
                    <View
                        accessible={landed !== null}
                        accessibilityLiveRegion="polite"
                        accessibilityLabel={landed
                            ? t("onboarding.counterExample", { amount: formatNumber(PERIOD_PAY[landed]), period: t(PERIOD_KEYS[landed]) })
                            : undefined}
                        style={styles.total}
                    />
                </Animated.View>
            </PageLayer>
            {state.done && !reduced ? (
                <PageLayer index={index} depth={DEPTH.art} zIndex={2}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("onboarding.intro.replay")}
                        onPress={replay}
                        style={styles.replay}
                    />
                </PageLayer>
            ) : null}
            <PageLayer index={index} depth={DEPTH.copy} zIndex={4}>
                {state.copyIn ? (
                    <StepCopy
                        top={640}
                        title={t("onboarding.intro.title")}
                        body={t("onboarding.intro.body")}
                        titleDelay={0}
                        bodyDelay={300}
                    />
                ) : null}
            </PageLayer>
        </>
    );
}

const styles = StyleSheet.create({
    total: {
        position: "absolute",
        top: 89,
        left: 40,
        right: 40,
        height: 150,
    },
    /** The illustration, down to where the promise starts. */
    replay: {
        position: "absolute",
        top: 80,
        left: 0,
        right: 0,
        height: 540,
    },
});
