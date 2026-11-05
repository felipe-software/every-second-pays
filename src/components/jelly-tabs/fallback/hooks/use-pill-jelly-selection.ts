/* eslint-disable react-hooks/immutability */
import { useCallback, useEffect, useRef } from "react";

import { getMaxTabIndex } from "../utils/animation";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";
import type { PillJellyState } from "./use-pill-jelly-state";

interface PillJellySelectionOptions {
    controlledSelectedIndex?: number | null;
    onTabChange?: (index: number) => void;
    onTabPress?: (index: number) => boolean | void;
    setFrameLoopActive: (active: boolean) => void;
    state: PillJellyState;
    tabCount: number;
}

export const getControlledSelectedIndex = (selectedIndex: number | null, tabCount: number) => {
    if (selectedIndex === null || selectedIndex < 0 || tabCount === 0) {
        return -1;
    }

    return Math.min(selectedIndex, getMaxTabIndex(tabCount));
};

const settleOnIndex = (state: PillJellyState, index: number) => {
    state.selectedIndex.value = index;
    if (index >= 0) {
        state.targetValue.value = index;
    }
    state.releasePending.value = 1;
    state.pressTarget.value = 0;
    state.shapeTarget.value = 1;
};

export const usePillJellySelection = ({
    controlledSelectedIndex,
    onTabChange,
    onTabPress,
    setFrameLoopActive,
    state,
    tabCount,
}: PillJellySelectionOptions) => {
    useEffect(() => {
        if (controlledSelectedIndex === undefined) {
            return;
        }

        settleOnIndex(state, getControlledSelectedIndex(controlledSelectedIndex, tabCount));
        setFrameLoopActive(true);
        setFrameLoopActive(false);
    }, [controlledSelectedIndex, setFrameLoopActive, state, tabCount]);

    const controlledSelectedIndexRef = useRef(controlledSelectedIndex);
    useIsomorphicLayoutEffect(() => {
        controlledSelectedIndexRef.current = controlledSelectedIndex;
    }, [controlledSelectedIndex]);

    const confirmTabPressOnJS = useCallback(
        (index: number) => {
            const accepted = onTabPress?.(index);
            if (accepted === false) {
                const controlledIndex = controlledSelectedIndexRef.current;
                const fallbackIndex =
                    controlledIndex === undefined
                        ? state.selectedIndex.value
                        : getControlledSelectedIndex(controlledIndex, tabCount);
                settleOnIndex(state, fallbackIndex);
                return;
            }

            if (index !== state.selectedIndex.value) {
                state.selectedIndex.value = index;
                onTabChange?.(index);
            }
        },
        [onTabChange, onTabPress, state, tabCount],
    );

    const activateTab = useCallback(
        (index: number) => {
            if (tabCount === 0) {
                return;
            }

            const nextIndex = Math.min(Math.max(index, 0), getMaxTabIndex(tabCount));
            state.progressOwnedByTabBar.value = 1;
            state.targetValue.value = nextIndex;
            state.releasePending.value = 1;
            setFrameLoopActive(true);
            setFrameLoopActive(false);
            confirmTabPressOnJS(nextIndex);
        },
        [confirmTabPressOnJS, setFrameLoopActive, state, tabCount],
    );

    return { activateTab, confirmTabPressOnJS };
};
