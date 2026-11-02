import { useIsFocused } from "expo-router";
import { type PropsWithChildren, type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import { useMoneyLandingHaptic } from "@/features/haptics/haptics";

import { FlyingMoney } from "./flying-money";
import { createMoneyBurst, measureInWindow, type MoneyBurst } from "./money-burst";

export const MONEY_IMPACT_DELAY = 480;

type MoneyTransferBase = {
    id: number;
    origins: {
        delay: number;
        node: View;
        sourceId: number;
    }[];
};

export type MoneyTransfer = MoneyTransferBase &
    ({ target: "cents" } | { target: "whole"; nextWhole: number; changedDigitIndex: number });

const COUNTER_IMPACT_SCALE: Record<MoneyTransfer["target"], number> = {
    cents: 1.045,
    whole: 1.1,
};

function counterBounce(peakScale: number) {
    return withSequence(
        ReduceMotion.System,
        withTiming(peakScale, {
            duration: 105,
            easing: Easing.out(Easing.quad),
            reduceMotion: ReduceMotion.System,
        }),
        withSpring(1, {
            damping: 11,
            mass: 0.55,
            stiffness: 220,
            reduceMotion: ReduceMotion.System,
        }),
    );
}

function scheduleLandingHaptics(bursts: MoneyBurst[], isFocusedRef: RefObject<boolean>, playMoneyLanding: () => void) {
    return bursts
        .flatMap((burst) => burst.notes)
        .map((note) =>
            setTimeout(() => {
                if (isFocusedRef.current) playMoneyLanding();
            }, MONEY_IMPACT_DELAY + note.delay),
        );
}

export function MoneyCounterCelebration({
    children,
    transfer,
    wholeTargetRef,
    centsTargetRef,
    size,
}: PropsWithChildren<{
    transfer: MoneyTransfer | null;
    wholeTargetRef: RefObject<View | null>;
    centsTargetRef: RefObject<View | null>;
    size: number;
}>) {
    const isFocused = useIsFocused();
    const isFocusedRef = useRef(isFocused);
    const stageRef = useRef<View>(null);
    const [bursts, setBursts] = useState<MoneyBurst[]>([]);
    const playMoneyLanding = useMoneyLandingHaptic();
    const counterScale = useSharedValue(1);
    const counterStyle = useAnimatedStyle(() => ({
        transform: [{ scale: counterScale.get() }],
    }));

    const previousSize = useRef(size);

    useLayoutEffect(() => {
        isFocusedRef.current = isFocused;
    }, [isFocused]);

    useLayoutEffect(() => {
        const from = previousSize.current;
        previousSize.current = size;
        if (from === size) return;

        cancelAnimation(counterScale);
        counterScale.set(from / size);
        counterScale.set(counterBounce(COUNTER_IMPACT_SCALE.whole));
    }, [counterScale, size]);

    useEffect(() => {
        if (!transfer) return undefined;

        const stageNode = stageRef.current;
        const targetNode = transfer.target === "whole" ? wholeTargetRef.current : centsTargetRef.current;
        if (!stageNode || !targetNode) return undefined;

        let cancelled = false;
        const hapticTimers: ReturnType<typeof setTimeout>[] = [];
        void Promise.all([
            Promise.all(transfer.origins.map(({ node }) => measureInWindow(node))),
            measureInWindow(targetNode),
            measureInWindow(stageNode),
        ]).then(([origins, target, stage]) => {
            if (cancelled) return;
            const frame = { target, stage };
            const nextBursts = origins.map((origin, index) =>
                createMoneyBurst(transfer, transfer.origins[index], origin, frame),
            );
            setBursts(nextBursts);

            if (!isFocusedRef.current) return;
            hapticTimers.push(...scheduleLandingHaptics(nextBursts, isFocusedRef, playMoneyLanding));
        });

        cancelAnimation(counterScale);
        counterScale.set(1);
        const impactScale = COUNTER_IMPACT_SCALE[transfer.target];
        counterScale.set(withDelay(MONEY_IMPACT_DELAY, counterBounce(impactScale), ReduceMotion.System));

        return () => {
            cancelled = true;
            hapticTimers.forEach(clearTimeout);
        };
    }, [centsTargetRef, counterScale, playMoneyLanding, transfer, wholeTargetRef]);

    useEffect(() => () => cancelAnimation(counterScale), [counterScale]);

    return (
        <View ref={stageRef} collapsable={false} style={styles.stage}>
            <View
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.burstLayer}
                testID="money-burst-layer"
            >
                {bursts.flatMap((burst) =>
                    burst.notes.map((note) => (
                        <FlyingMoney key={`${burst.id}-${burst.sourceId}-${note.id}`} note={note} />
                    )),
                )}
            </View>
            <Animated.View testID="earnings-counter" style={[styles.counter, counterStyle]}>
                {children}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    stage: {
        // Fits the 88 pt total; smaller sizes center inside it so the list never moves.
        height: 96,
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
    },
    burstLayer: {
        ...StyleSheet.absoluteFill,
        zIndex: 2,
        overflow: "visible",
    },
    counter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
    },
});
