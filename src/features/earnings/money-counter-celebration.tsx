import { Image } from "expo-image";
import { useIsFocused } from "expo-router";
import { memo, type PropsWithChildren, type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    Extrapolation,
    interpolate,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import { useMoneyLandingHaptic } from "@/features/haptics/haptics";

export const MONEY_IMPACT_DELAY = 480;

type MoneyTransferBase = {
    id: number;
    origins: {
        delay: number;
        node: View;
        sourceId: number;
    }[];
};

export type MoneyTransfer = MoneyTransferBase & (
    | { target: "cents" }
    | { target: "whole"; nextWhole: number; changedDigitIndex: number }
);

type MeasuredRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type FlyingNote = {
    id: number;
    delay: number;
    size: number;
    targetX: number;
    targetY: number;
    startX: number;
    startY: number;
    curveX: number;
    startRotation: number;
    middleRotation: number;
    endRotation: number;
    mirrorX: 1 | -1;
};

type MoneyBurst = {
    id: number;
    sourceId: number;
    notes: FlyingNote[];
};

const FLIGHT_DURATION = 640;
const COUNTER_IMPACT_SCALE: Record<MoneyTransfer["target"], number> = {
    cents: 1.045,
    whole: 1.1,
};

function randomBetween(min: number, max: number) {
    return min + Math.random() * (max - min);
}

function measureInWindow(node: View) {
    return new Promise<MeasuredRect>((resolve) => {
        node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
    });
}

function noteCountFor(target: MoneyTransfer["target"]) {
    const variation = Math.random() < 0.5 ? 0 : 1;
    return target === "whole" ? 4 + variation : 1 + variation;
}

function createMoneyBurst(
    transfer: MoneyTransfer,
    sourceId: number,
    sourceDelay: number,
    origin: MeasuredRect,
    target: MeasuredRect,
    stage: MeasuredRect,
): MoneyBurst {
    const count = noteCountFor(transfer.target);
    const notes = Array.from({ length: count }, (_, index) => {
        const originX = origin.x + origin.width / 2 + randomBetween(-origin.width * 0.32, origin.width * 0.32);
        const originY = origin.y + origin.height / 2 + randomBetween(-origin.height * 0.3, origin.height * 0.3);
        const targetSpreadX = Math.min(10, target.width * 0.16);
        const targetSpreadY = Math.min(5, target.height * 0.12);
        const targetX = target.x + target.width / 2 + randomBetween(-targetSpreadX, targetSpreadX);
        const targetY = target.y + target.height / 2 + randomBetween(-targetSpreadY, targetSpreadY);
        const startRotation = randomBetween(-42, 42);
        const mirrorX: 1 | -1 = Math.random() < 0.5 ? -1 : 1;

        return {
            id: index,
            delay: sourceDelay + index * randomBetween(32, 52),
            size: randomBetween(72, 96),
            targetX: targetX - stage.x,
            targetY: targetY - stage.y,
            startX: originX - targetX,
            startY: originY - targetY,
            curveX: randomBetween(-46, 46),
            startRotation,
            middleRotation: startRotation + randomBetween(-58, 58),
            endRotation: randomBetween(-18, 18),
            mirrorX,
        };
    });

    return { id: transfer.id, sourceId, notes };
}

const FlyingMoney = memo(function FlyingMoney({ note }: { note: FlyingNote }) {
    const progress = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.get(), [0, 0.08, 0.82, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
        transform: [
            {
                translateX: interpolate(
                    progress.get(),
                    [0, 0.52, 1],
                    [note.startX, note.startX * 0.48 + note.curveX, 0],
                    Extrapolation.CLAMP,
                ),
            },
            {
                translateY: interpolate(
                    progress.get(),
                    [0, 0.52, 1],
                    [note.startY, note.startY * 0.46 - 34, 0],
                    Extrapolation.CLAMP,
                ),
            },
            {
                rotateZ: `${interpolate(
                    progress.get(),
                    [0, 0.55, 1],
                    [note.startRotation, note.middleRotation, note.endRotation],
                    Extrapolation.CLAMP,
                )}deg`,
            },
            {
                scale: interpolate(progress.get(), [0, 0.12, 0.78, 1], [0.45, 1.04, 0.82, 0.28], Extrapolation.CLAMP),
            },
            { scaleX: note.mirrorX },
        ],
    }));

    useEffect(() => {
        progress.set(0);
        progress.set(withDelay(
            note.delay,
            withTiming(1, {
                duration: FLIGHT_DURATION,
                easing: Easing.inOut(Easing.cubic),
                reduceMotion: ReduceMotion.System,
            }),
            ReduceMotion.System,
        ));

        return () => cancelAnimation(progress);
    }, [note.delay, progress]);

    return (
        <Animated.View
            style={[
                styles.note,
                {
                    left: note.targetX,
                    top: note.targetY,
                    width: note.size,
                    height: note.size,
                    marginLeft: note.size / -2,
                    marginTop: note.size / -2,
                },
                animatedStyle,
            ]}
        >
            <Image
                source={require("@/assets/images/android-icon-foreground.png")}
                contentFit="contain"
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
    );
});

export function MoneyCounterCelebration({
    children,
    transfer,
    wholeTargetRef,
    centsTargetRef,
}: PropsWithChildren<{
    transfer: MoneyTransfer | null;
    wholeTargetRef: RefObject<View | null>;
    centsTargetRef: RefObject<View | null>;
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

    useLayoutEffect(() => {
        isFocusedRef.current = isFocused;
    }, [isFocused]);

    useEffect(() => {
        if (!transfer) return;

        const stageNode = stageRef.current;
        const targetNode = transfer.target === "whole" ? wholeTargetRef.current : centsTargetRef.current;
        if (!stageNode || !targetNode) return;

        let cancelled = false;
        const hapticTimers: ReturnType<typeof setTimeout>[] = [];
        void Promise.all([
            Promise.all(transfer.origins.map(({ node }) => measureInWindow(node))),
            measureInWindow(targetNode),
            measureInWindow(stageNode),
        ]).then(([origins, target, stage]) => {
            if (cancelled) return;
            const nextBursts = origins.map((origin, index) => createMoneyBurst(
                transfer,
                transfer.origins[index].sourceId,
                transfer.origins[index].delay,
                origin,
                target,
                stage,
            ));
            setBursts(nextBursts);

            if (!isFocusedRef.current) return;
            nextBursts.forEach((burst) => {
                burst.notes.forEach((note) => {
                    hapticTimers.push(setTimeout(() => {
                        if (isFocusedRef.current) playMoneyLanding();
                    }, MONEY_IMPACT_DELAY + note.delay));
                });
            });
        });

        cancelAnimation(counterScale);
        counterScale.set(1);
        const impactScale = COUNTER_IMPACT_SCALE[transfer.target];
        counterScale.set(withDelay(
            MONEY_IMPACT_DELAY,
            withSequence(
                ReduceMotion.System,
                withTiming(impactScale, {
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
            ),
            ReduceMotion.System,
        ));

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
                {bursts.flatMap((burst) => burst.notes.map((note) => (
                    <FlyingMoney key={`${burst.id}-${burst.sourceId}-${note.id}`} note={note} />
                )))}
            </View>
            <Animated.View testID="earnings-counter" style={[styles.counter, counterStyle]}>
                {children}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    stage: {
        minHeight: 92,
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
    },
    burstLayer: {
        ...StyleSheet.absoluteFill,
        zIndex: 2,
        overflow: "visible",
    },
    note: {
        position: "absolute",
    },
    counter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
    },
});
