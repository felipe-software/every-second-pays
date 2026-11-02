import type { PillJellyFrameState } from "../utils/pill-jelly-animation";
import { useMemo } from "react";
import { useSharedValue } from "react-native-reanimated";

const usePillMotionValues = (initialSelectedIndex: number) => {
    const initialPillPosition = Math.max(initialSelectedIndex, 0);
    const trackWidth = useSharedValue(0);
    const value = useSharedValue(initialPillPosition);
    const valueVelocity = useSharedValue(0);
    const targetValue = useSharedValue(initialPillPosition);
    const selectedIndex = useSharedValue(initialSelectedIndex);

    const filteredVelocity = useSharedValue(0);
    const filteredVelocityRate = useSharedValue(0);

    const pressProgress = useSharedValue(0);
    const pressProgressRate = useSharedValue(0);
    const pressTarget = useSharedValue(0);

    const baseScaleX = useSharedValue(1);
    const baseScaleXRate = useSharedValue(0);
    const baseScaleY = useSharedValue(1);
    const baseScaleYRate = useSharedValue(0);
    const shapeTarget = useSharedValue(1);

    return {
        baseScaleX,
        baseScaleXRate,
        baseScaleY,
        baseScaleYRate,
        filteredVelocity,
        filteredVelocityRate,
        pressProgress,
        pressProgressRate,
        pressTarget,
        selectedIndex,
        shapeTarget,
        targetValue,
        trackWidth,
        value,
        valueVelocity,
    };
};

const usePillInteractionValues = () => {
    const rawPanelOffset = useSharedValue(0);
    const rawPanelOffsetVelocity = useSharedValue(0);

    const isDragging = useSharedValue(0);
    const progressOwnedByTabBar = useSharedValue(0);
    const releasePending = useSharedValue(0);
    const downX = useSharedValue(0);
    const webTrackPageX = useSharedValue(Number.NaN);
    const movedDistance = useSharedValue(0);
    const dragStartTarget = useSharedValue(0);
    const dragStartPanelOffset = useSharedValue(0);

    return {
        downX,
        dragStartPanelOffset,
        dragStartTarget,
        isDragging,
        movedDistance,
        progressOwnedByTabBar,
        rawPanelOffset,
        rawPanelOffsetVelocity,
        releasePending,
        webTrackPageX,
    };
};

export const usePillJellySharedValues = (initialSelectedIndex: number) => {
    const motion = usePillMotionValues(initialSelectedIndex);
    const interaction = usePillInteractionValues();
    const {
        baseScaleX,
        baseScaleXRate,
        baseScaleY,
        baseScaleYRate,
        filteredVelocity,
        filteredVelocityRate,
        pressProgress,
        pressProgressRate,
        pressTarget,
        shapeTarget,
        targetValue,
        value,
        valueVelocity,
    } = motion;
    const { isDragging, rawPanelOffset, rawPanelOffsetVelocity, releasePending } = interaction;

    // A stable container stops Reanimated serializing it again on unrelated renders.
    const frameState = useMemo<PillJellyFrameState>(
        () => ({
            baseScaleX: { value: baseScaleX, velocity: baseScaleXRate },
            baseScaleY: { value: baseScaleY, velocity: baseScaleYRate },
            filteredVelocity: { value: filteredVelocity, velocity: filteredVelocityRate },
            isDragging,
            position: { value, velocity: valueVelocity },
            pressProgress: { value: pressProgress, velocity: pressProgressRate },
            pressTarget,
            rawPanelOffset: { value: rawPanelOffset, velocity: rawPanelOffsetVelocity },
            releasePending,
            shapeTarget,
            targetValue,
        }),
        [
            baseScaleX,
            baseScaleXRate,
            baseScaleY,
            baseScaleYRate,
            filteredVelocity,
            filteredVelocityRate,
            isDragging,
            pressProgress,
            pressProgressRate,
            pressTarget,
            rawPanelOffset,
            rawPanelOffsetVelocity,
            releasePending,
            shapeTarget,
            targetValue,
            value,
            valueVelocity,
        ],
    );

    return { ...motion, ...interaction, frameState };
};

export type PillJellySharedValues = ReturnType<typeof usePillJellySharedValues>;
