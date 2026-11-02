/* eslint-disable react-hooks/immutability */
import type { PillJellyConfig } from "../constants";
import { advancePillJellyFrame } from "../utils/pill-jelly-animation";
import type { PillJellySharedValues } from "./use-pill-jelly-shared-values";
import { useCallback, useRef } from "react";
import { type SharedValue, useFrameCallback } from "react-native-reanimated";

interface PillJellyFrameLoopOptions {
    controlledProgress?: SharedValue<number>;
    pillJelly: PillJellyConfig;
    sharedValues: PillJellySharedValues;
    tabCount: number;
}

export const usePillJellyFrameLoop = ({
    controlledProgress,
    pillJelly,
    sharedValues,
    tabCount,
}: PillJellyFrameLoopOptions) => {
    const { frameState, isDragging, progressOwnedByTabBar, targetValue, value, valueVelocity } = sharedValues;

    const frameCallback = useCallback(
        ({ timeSincePreviousFrame }: { timeSincePreviousFrame: number | null }) => {
            "worklet";

            advancePillJellyFrame(frameState, pillJelly.frameConfig, tabCount, timeSincePreviousFrame);

            if (controlledProgress !== undefined && progressOwnedByTabBar.value === 1) {
                controlledProgress.value = value.value;

                const positionSettled =
                    isDragging.value === 0 &&
                    Math.abs(value.value - targetValue.value) < 0.001 &&
                    Math.abs(valueVelocity.value) < 0.001;
                if (positionSettled) {
                    progressOwnedByTabBar.value = 0;
                }
            }
        },
        [
            controlledProgress,
            frameState,
            isDragging,
            pillJelly.frameConfig,
            progressOwnedByTabBar,
            tabCount,
            targetValue,
            value,
            valueVelocity,
        ],
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
                }, 500);
            }
        },
        [frameLoop],
    );
};
