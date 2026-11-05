/* eslint-disable react-hooks/immutability */
import { useCallback, useRef } from "react";
import { clamp, type SharedValue, useAnimatedReaction, useFrameCallback } from "react-native-reanimated";

import { getMaxTabIndex } from "../utils/animation";
import { advancePillJellyFrame, type PillJellyFrameConfig } from "../utils/pill-jelly-animation";
import type { PillJellyState } from "./use-pill-jelly-state";

const FRAME_LOOP_STOP_DELAY = 500;

export const usePillJellyFrameLoop = (
    state: PillJellyState,
    frameConfig: PillJellyFrameConfig,
    tabCount: number,
    controlledProgress?: SharedValue<number>,
) => {
    const frameCallback = useCallback(
        ({ timeSincePreviousFrame }: { timeSincePreviousFrame: number | null }) => {
            "worklet";

            advancePillJellyFrame(state, frameConfig, tabCount, timeSincePreviousFrame);

            if (controlledProgress !== undefined && state.progressOwnedByTabBar.value === 1) {
                controlledProgress.value = state.value.value;

                const positionSettled =
                    state.isDragging.value === 0 &&
                    Math.abs(state.value.value - state.targetValue.value) < 0.001 &&
                    Math.abs(state.valueVelocity.value) < 0.001;
                if (positionSettled) {
                    state.progressOwnedByTabBar.value = 0;
                }
            }
        },
        [controlledProgress, frameConfig, state, tabCount],
    );
    const frameLoop = useFrameCallback(frameCallback, false);
    const frameLoopStopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    return useCallback(
        (active: boolean) => {
            if (frameLoopStopTimeout.current !== null) {
                clearTimeout(frameLoopStopTimeout.current);
            }
            if (active) {
                frameLoop.setActive(true);
            } else {
                frameLoopStopTimeout.current = setTimeout(() => {
                    frameLoop.setActive(false);
                    frameLoopStopTimeout.current = null;
                }, FRAME_LOOP_STOP_DELAY);
            }
        },
        [frameLoop],
    );
};

export const useControlledProgressSync = (
    state: PillJellyState,
    tabCount: number,
    controlledProgress?: SharedValue<number>,
) =>
    useAnimatedReaction(
        () => controlledProgress?.value,
        (nextProgress) => {
            if (nextProgress === undefined || tabCount === 0 || state.progressOwnedByTabBar.value === 1) {
                return;
            }

            const nextValue = clamp(nextProgress, 0, getMaxTabIndex(tabCount));
            state.value.value = nextValue;
            state.targetValue.value = nextValue;
            state.valueVelocity.value = 0;
            state.releasePending.value = 0;
        },
        [controlledProgress, state, tabCount],
    );
