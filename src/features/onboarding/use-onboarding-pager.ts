import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { BackHandler } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { cancelAnimation, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { appHaptics } from "@/features/haptics/haptics";

import { EASE_SOFT_FN } from "./motion";
import { LAST_PAGE, PAGE_WIDTH, PAGES } from "./onboarding-pages";

const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 0.45;
const RUBBER_BAND = 0.3;

type PagerOptions = { exiting: boolean; introDone: boolean; scale: number };

export function useOnboardingPager({ exiting, introDone, scale }: PagerOptions) {
    const [step, setStep] = useState(0);
    const [visited, setVisited] = useState(() => PAGES.map((_, index) => index === 0));

    const position = useSharedValue(0);
    const lagging = useSharedValue(0);
    const backdrop = useSharedValue(0);
    const current = useSharedValue(0);
    const dragFrom = useSharedValue(0);
    const pager = useMemo(() => ({ position, lagging }), [position, lagging]);

    const settleTo = (target: number) => {
        "worklet";
        current.set(target);
        position.set(withTiming(target, { duration: 780, easing: EASE_SOFT_FN }));
        lagging.set(withTiming(target, { duration: 940, easing: EASE_SOFT_FN }));
        backdrop.set(withTiming(target, { duration: 1500, easing: EASE_SOFT_FN }));
    };

    const visit = (...pages: number[]) =>
        setVisited((seen) =>
            pages.some((page) => page >= 0 && page <= LAST_PAGE && !seen[page])
                ? seen.map((value, index) => value || pages.includes(index))
                : seen,
        );

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

    // oxlint-disable-next-line react/capitalized-calls
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

    return { step, visited, position, backdrop, pager, go, pan };
}

type BackOptions = { exiting: boolean; step: number; go: (target: number) => void };

export function useBackThroughPages({ exiting, step, go }: BackOptions) {
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
}
