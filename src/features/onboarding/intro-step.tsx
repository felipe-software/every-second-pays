import { useEffect, useEffectEvent, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import type { OnboardingHaptic } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { introCounter, introWords, ONBOARDING_ART } from "./art/sources";
import { StepArt } from "./art/step-art";
import { useOnboardingHaptic } from "./haptics-context";
import { IntroLabels } from "./intro-labels";
import {
    BIRD,
    DAY_PAY,
    DIVE,
    introDrop,
    LIFT,
    MONTH_PAY,
    MONTH_WORKDAYS,
    type Stage,
    YEAR_PAY,
} from "./intro-timeline";
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
    stopped,
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
    /** Leaving the onboarding: no more beats. */
    stopped: boolean;
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
    const playHaptic = useOnboardingHaptic();

    const ready = useEffectEvent(onSkipReady);
    const finish = useEffectEvent(onDone);
    const impact = useEffectEvent(onImpact);
    const lift = useEffectEvent(onLift);
    const haptic = useEffectEvent((name: OnboardingHaptic | "landing") => playHaptic(name));

    useEffect(() => {
        if (reduced) {
            ready();
            finish();
            return;
        }
        if (stopped) return;

        const timers: ReturnType<typeof setTimeout>[] = [];
        const at = (time: number, beat: () => void) => timers.push(setTimeout(beat, time));
        const update = (change: Partial<IntroState>) => setState((current) => ({ ...current, ...change }));
        const hit = (period: Period, big: boolean) => {
            update({ landed: period });
            impact(big);
            haptic(big ? "finale" : "impact");
        };

        const first = replays === 0;
        at(420, () => update({ stage: 1 }));
        if (first) at(700, ready);

        // Day: the bird bursts into eight bills, which dive into the hours one by one, nine to five.
        const burstAt = BIRD.at + BIRD.flight;
        at(burstAt, () => haptic("burst"));
        for (let hour = 0; hour < 8; hour += 1) {
            // A dive lands at 70% of its run.
            at(burstAt + DIVE.delay + hour * DIVE.gap + DIVE.duration * 0.7, () => haptic("landing"));
        }
        const dayHit = burstAt + DIVE.delay + 7 * DIVE.gap + DIVE.duration;
        at(dayHit, () => hit("day", false));

        // Week: the day re-flows into Monday; Tuesday to Friday fill; the weekend stays empty.
        const weekAt = dayHit + 500;
        at(weekAt, () => update({ stage: 2 }));
        [700, 970, 1240, 1510].forEach((offset) => {
            // The first bill lands at 76% of its 520 ms drop.
            at(weekAt + offset + 395, () => haptic("column"));
        });
        at(weekAt + 2310, () => hit("week", false));

        // Month: each weekday column compresses into a calendar cell, then the month fills.
        const monthAt = weekAt + 2700;
        const monthDropsAt = monthAt + 700;
        at(monthAt, () => update({ stage: 3 }));
        at(monthDropsAt + 304, () => haptic("month"));
        at(monthDropsAt + (MONTH_WORKDAYS - 1) * 46 + 600, () => hit("month", false));

        // Year: the month packs into a strapped bundle of cash that hops onto the pile, and the
        // other eleven months drop onto it one after another.
        const yearAt = monthAt + 2250;
        const rainAt = yearAt + 740;
        const rainGap = 60;
        at(yearAt, () => update({ stage: 4 }));
        at(yearAt + 700, () => haptic("bundle"));
        at(rainAt + 340, () => haptic("pile"));
        const finaleAt = rainAt + 10 * rainGap + 400;
        at(finaleAt, () => hit("year", true));
        at(finaleAt + LIFT.delay, () => {
            update({ lifted: true });
            lift(true);
        });
        // The promise comes in while the story is still rising into place.
        at(finaleAt + LIFT.delay + 200, () => update({ copyIn: true }));
        at(finaleAt + LIFT.delay + 600, () => {
            update({ done: true });
            finish();
        });

        return () => timers.forEach(clearTimeout);
    }, [reduced, replays, stopped]);

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
                    />
                    <IntroLabels stage={state.stage} />
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
