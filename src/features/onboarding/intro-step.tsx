import { useEffect, useEffectEvent, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { useDerivedValue, useSharedValue } from "react-native-reanimated";

import { useScoreHaptic } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { introCounter, introWords, ONBOARDING_ART } from "./art/sources";
import { FPS, StepArt, useDrawnFrame } from "./art/step-art";
import { INTRO_HAPTICS, INTRO_HAPTICS_AT } from "./intro-haptics";
import { IntroLabels } from "./intro-labels";
import { artShift, introDrop, LIFT, type Stage, STORY } from "./intro-timeline";
import { IntroTotalLabel, type Period } from "./intro-total-label";
import { DEPTH, PageLayer } from "./pager";
import { StepCopy } from "./step-copy";

type Beat =
    | { type: "stage"; stage: Stage }
    | { type: "ready" | "haptics" | "lift" | "copy" | "done" }
    | { type: "total"; period: Period };

// On the art's own frames, not timers, so a busy JS thread can't put the story out of step.
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
    landed: Period | null;
    lifted: boolean;
    copyIn: boolean;
    done: boolean;
};

const START: IntroState = { stage: 0, landed: null, lifted: false, copyIn: false, done: false };

// Every 0.4 s of the story, so each of its effects has been drawn once before it plays.
const PRIME_STEP = 24;

function storyFrames([start, end]: [number, number]) {
    const frames = Array.from(
        { length: Math.floor((end - start) / PRIME_STEP) + 1 },
        (_, index) => start + index * PRIME_STEP,
    );
    return [...frames, end];
}

const SETTLED: IntroState = { stage: 4, landed: "year", lifted: true, copyIn: true, done: true };

const REPLAY: IntroState = { ...START, done: true };

export type IntroEvents = {
    onSkipReady: () => void;
    onImpact: (big: boolean) => void;
    onLift: (lifted: boolean) => void;
    onReplay: () => void;
    onDone: () => void;
};

type IntroStepProps = IntroEvents & {
    index: number;
    playing: boolean;
    reduced: boolean;
    onArtReady: () => Promise<void> | void;
};

export function IntroStep({
    index,
    playing,
    reduced,
    onSkipReady,
    onImpact,
    onLift,
    onReplay,
    onDone,
    onArtReady,
}: IntroStepProps) {
    const { t, language, formatNumber } = useI18n();
    const art = ONBOARDING_ART.intro();
    const counter = introCounter(formatNumber);
    const words = introWords(language);
    const [state, setState] = useState(reduced ? SETTLED : START);
    const [replays, setReplays] = useState(0);
    const haptics = useScoreHaptic(INTRO_HAPTICS);
    const [storyStart, storyEnd] = art.segments.story;
    const frame = useSharedValue(reduced ? art.segments.ambient[0] : storyStart);
    const drawnFrame = useDrawnFrame(frame, storyEnd);
    const artShifted = useDerivedValue(() => artShift(((drawnFrame.get() - storyStart) * 1000) / FPS));

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
        return undefined;
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
    const cues = INTRO_BEATS.map(([time], beat) => ({ frame: storyStart + (time * FPS) / 1000, name: String(beat) }));

    const replay = () => {
        setState(REPLAY);
        onLift(false);
        onReplay();
        setReplays((count) => count + 1);
    };

    return (
        <>
            <PageLayer index={index} depth={DEPTH.art} zIndex={1} passThrough>
                <Animated.View style={[StyleSheet.absoluteFill, introDrop(state.lifted)]}>
                    {/* No `ambient` loop: it's the last frame held still, and looping redraws it every vsync. */}
                    <StepArt
                        source={art}
                        overlays={[counter, words]}
                        intro="story"
                        playing={playing}
                        reduced={reduced}
                        replay={replays}
                        frame={frame}
                        cues={cues}
                        onCue={(name, late) => play(INTRO_BEATS[Number(name)][1], late)}
                        prime={storyFrames(art.segments.story)}
                        onReady={onArtReady}
                    />
                    <IntroLabels stage={state.stage} shift={artShifted} />
                    <IntroTotalLabel landed={state.landed} />
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
    replay: {
        position: "absolute",
        top: 80,
        left: 0,
        right: 0,
        height: 540,
    },
});
