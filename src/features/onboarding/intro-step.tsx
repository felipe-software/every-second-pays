import { useEffect, useEffectEvent, useState } from "react";

import type { OnboardingHaptic } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { ONBOARDING_ART } from "./art/sources";
import { StepArt } from "./art/step-art";
import { useOnboardingHaptic } from "./haptics-context";
import { IntroCounter, type Period } from "./intro-counter";
import { IntroLabels } from "./intro-labels";
import { BIRD, DAY_PAY, DIVE, HOUR_PAY, MONTH_PAY, MONTH_WORKDAYS, type Stage, YEAR_PAY } from "./intro-timeline";
import { DEPTH, PageLayer } from "./pager";
import { StepCopy } from "./step-copy";

type IntroState = {
    counterIn: boolean;
    period: Period | null;
    stage: Stage;
    money: number;
    hits: number;
    big: boolean;
    copyIn: boolean;
};

const START: IntroState = { counterIn: false, period: null, stage: 0, money: 0, hits: 0, big: false, copyIn: false };

/** The end of the intro without the build-up: a year's pile of cash, for reduced motion. */
const SETTLED: IntroState = { counterIn: true, period: "year", stage: 4, money: YEAR_PAY, hits: 0, big: false, copyIn: true };

/**
 * Step one: an example wage adding up from a day of hours to a year of cash, each period
 * zooming out of the last, then the app's promise. The illustration is the design's own
 * animation; the total, its period and the labels are drawn here, in the reader's language,
 * on the same timeline.
 */
export function IntroStep({
    index,
    playing,
    stopped,
    reduced,
    onSkipReady,
    onImpact,
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
    onDone: () => void;
}) {
    const { t } = useI18n();
    const art = ONBOARDING_ART.intro();
    const [state, setState] = useState(reduced ? SETTLED : START);
    const playHaptic = useOnboardingHaptic();

    const ready = useEffectEvent(onSkipReady);
    const finish = useEffectEvent(onDone);
    const impact = useEffectEvent(onImpact);
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
        const update = (change: Partial<IntroState> | ((current: IntroState) => Partial<IntroState>)) =>
            setState((current) => ({ ...current, ...(typeof change === "function" ? change(current) : change) }));
        const earn = (amount: number) => update((current) => ({ money: current.money + amount }));
        const hit = (big: boolean) => {
            update((current) => ({ hits: current.hits + 1, big }));
            impact(big);
            haptic(big ? "finale" : "impact");
        };

        at(150, () => update({ counterIn: true }));
        at(350, () => update({ period: "day" }));
        at(420, () => update({ stage: 1 }));
        at(700, ready);

        // Day: the bird bursts into eight bills, which dive into the hours one by one, nine to five.
        const burstAt = BIRD.at + BIRD.flight;
        at(burstAt, () => haptic("burst"));
        for (let hour = 0; hour < 8; hour += 1) {
            // A dive lands at 70% of its run.
            at(burstAt + DIVE.delay + hour * DIVE.gap + DIVE.duration * 0.7, () => {
                earn(HOUR_PAY);
                haptic("landing");
            });
        }
        const dayHit = burstAt + DIVE.delay + 7 * DIVE.gap + DIVE.duration;
        at(dayHit, () => hit(false));

        // Week: the day re-flows into Monday; Tuesday to Friday fill; the weekend stays empty.
        const weekAt = dayHit + 500;
        at(weekAt, () => update({ period: "week", stage: 2 }));
        [700, 970, 1240, 1510].forEach((offset) => {
            const dropAt = weekAt + offset;
            // The first bill lands at 76% of its 520 ms drop.
            at(dropAt + 395, () => haptic("column"));
            at(dropAt + 420, () => earn(DAY_PAY));
        });
        at(weekAt + 2310, () => hit(false));

        // Month: each weekday column compresses into a calendar cell, then the month fills.
        const monthAt = weekAt + 2700;
        const monthDropsAt = monthAt + 700;
        at(monthAt, () => update({ period: "month", stage: 3 }));
        at(monthDropsAt + 304, () => haptic("month"));
        for (let workday = 0; workday < MONTH_WORKDAYS; workday += 1) {
            at(monthDropsAt + workday * 46 + 304, () => earn(DAY_PAY));
        }
        at(monthDropsAt + 16 * 46 + 600, () => hit(false));

        // Year: the month packs into a strapped bundle of cash that hops onto the pile, and the
        // other eleven months drop onto it one after another.
        const yearAt = monthAt + 2250;
        const rainAt = yearAt + 740;
        const rainGap = 60;
        at(yearAt, () => update({ period: "year", stage: 4 }));
        at(yearAt + 700, () => haptic("bundle"));
        for (let month = 1; month < 12; month += 1) {
            // A bundle lands at 68% of its 500 ms drop.
            at(rainAt + (month - 1) * rainGap + 340, () => earn(MONTH_PAY));
        }
        at(rainAt + 340, () => haptic("pile"));
        const finaleAt = rainAt + 10 * rainGap + 400;
        at(finaleAt, () => hit(true));
        at(finaleAt + 340, () => update({ copyIn: true }));
        at(finaleAt + 740, finish);

        return () => timers.forEach(clearTimeout);
    }, [reduced, stopped]);

    return (
        <>
            <PageLayer index={index} depth={DEPTH.art} zIndex={1} passThrough>
                <StepArt source={art} intro="story" loop="ambient" playing={playing} reduced={reduced} />
            </PageLayer>
            <PageLayer index={index} depth={DEPTH.art} zIndex={2} passThrough>
                <IntroLabels stage={state.stage} />
                <IntroCounter
                    visible={state.counterIn}
                    money={state.money}
                    period={state.period}
                    hits={state.hits}
                    big={state.big}
                />
            </PageLayer>
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
