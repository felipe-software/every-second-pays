/* eslint-disable react-hooks/immutability */
import { getMaxTabIndex } from "../utils/animation";
import { getControlledSelectedIndex } from "../utils/pill-jelly-selection";
import type { PillJellySharedValues } from "./use-pill-jelly-shared-values";
import { useEffect } from "react";
import { clamp, type SharedValue, useAnimatedReaction } from "react-native-reanimated";

interface PillJellyControlledSyncOptions {
    controlledProgress?: SharedValue<number>;
    controlledSelectedIndex?: number | null;
    setFrameLoopActive: (active: boolean) => void;
    sharedValues: PillJellySharedValues;
    tabCount: number;
}

export const usePillJellyControlledSync = ({
    controlledProgress,
    controlledSelectedIndex,
    setFrameLoopActive,
    sharedValues,
    tabCount,
}: PillJellyControlledSyncOptions) => {
    const {
        pressTarget,
        progressOwnedByTabBar,
        releasePending,
        selectedIndex,
        shapeTarget,
        targetValue,
        value,
        valueVelocity,
    } = sharedValues;

    useEffect(() => {
        if (controlledSelectedIndex === undefined) {
            return;
        }

        const nextIndex = getControlledSelectedIndex(controlledSelectedIndex, tabCount);
        selectedIndex.value = nextIndex;
        if (nextIndex >= 0) {
            targetValue.value = nextIndex;
        }
        releasePending.value = 1;
        pressTarget.value = 0;
        shapeTarget.value = 1;
        setFrameLoopActive(true);
        setFrameLoopActive(false);
    }, [
        controlledSelectedIndex,
        pressTarget,
        releasePending,
        selectedIndex,
        setFrameLoopActive,
        shapeTarget,
        tabCount,
        targetValue,
    ]);

    useAnimatedReaction(
        () => controlledProgress?.value,
        (nextProgress) => {
            if (nextProgress === undefined || tabCount === 0 || progressOwnedByTabBar.value === 1) {
                return;
            }

            const nextValue = clamp(nextProgress, 0, getMaxTabIndex(tabCount));
            value.value = nextValue;
            targetValue.value = nextValue;
            valueVelocity.value = 0;
            releasePending.value = 0;
        },
        [controlledProgress, progressOwnedByTabBar, tabCount],
    );
};
