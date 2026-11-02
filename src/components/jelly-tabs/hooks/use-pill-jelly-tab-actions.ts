/* eslint-disable react-hooks/immutability */
import { getMaxTabIndex } from "../utils/animation";
import { getControlledSelectedIndex } from "../utils/pill-jelly-selection";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";
import type { PillJellySharedValues } from "./use-pill-jelly-shared-values";
import { useCallback, useRef } from "react";

interface PillJellyTabActionsOptions {
    controlledSelectedIndex?: number | null;
    onTabChange?: (index: number) => void;
    onTabPress?: (index: number) => boolean | void;
    setFrameLoopActive: (active: boolean) => void;
    sharedValues: PillJellySharedValues;
    tabCount: number;
}

export const usePillJellyTabActions = ({
    controlledSelectedIndex,
    onTabChange,
    onTabPress,
    setFrameLoopActive,
    sharedValues,
    tabCount,
}: PillJellyTabActionsOptions) => {
    const { pressTarget, progressOwnedByTabBar, releasePending, selectedIndex, shapeTarget, targetValue } =
        sharedValues;

    // Read at call time so a new controlled index does not rebuild the gesture worklets.
    const controlledSelectedIndexRef = useRef(controlledSelectedIndex);
    useIsomorphicLayoutEffect(() => {
        controlledSelectedIndexRef.current = controlledSelectedIndex;
    }, [controlledSelectedIndex]);

    const confirmTabPressOnJS = useCallback(
        (index: number) => {
            const accepted = onTabPress?.(index);
            if (accepted === false) {
                // The controlled prop will not change after a rejected press, so its effect will not rerun.
                const controlledIndex = controlledSelectedIndexRef.current;
                const fallbackIndex =
                    controlledIndex === undefined
                        ? selectedIndex.value
                        : getControlledSelectedIndex(controlledIndex, tabCount);
                selectedIndex.value = fallbackIndex;
                if (fallbackIndex >= 0) {
                    targetValue.value = fallbackIndex;
                }
                releasePending.value = 1;
                pressTarget.value = 0;
                shapeTarget.value = 1;
                return;
            }

            if (index !== selectedIndex.value) {
                selectedIndex.value = index;
                onTabChange?.(index);
            }
        },
        [onTabChange, onTabPress, pressTarget, releasePending, selectedIndex, shapeTarget, tabCount, targetValue],
    );

    const activateTab = useCallback(
        (index: number) => {
            if (tabCount === 0) {
                return;
            }

            const nextIndex = Math.min(Math.max(index, 0), getMaxTabIndex(tabCount));
            progressOwnedByTabBar.value = 1;
            targetValue.value = nextIndex;
            releasePending.value = 1;
            setFrameLoopActive(true);
            setFrameLoopActive(false);
            confirmTabPressOnJS(nextIndex);
        },
        [confirmTabPressOnJS, progressOwnedByTabBar, releasePending, setFrameLoopActive, tabCount, targetValue],
    );

    return { activateTab, confirmTabPressOnJS };
};
