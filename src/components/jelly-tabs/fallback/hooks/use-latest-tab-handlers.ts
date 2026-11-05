import { useCallback, useRef, useState } from "react";

import type { JellyTabBarHeadlessProps } from "../types";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

type LatestTabProps = Pick<JellyTabBarHeadlessProps, "items" | "onTabChange" | "onTabLongPress" | "onTabPress">;

export const useLatestTabHandlers = ({ items, onTabChange, onTabLongPress, onTabPress }: LatestTabProps) => {
    const [uncontrolledSelectedIndex, setUncontrolledSelectedIndex] = useState(0);
    const latestProps = useRef<LatestTabProps>({ items, onTabChange, onTabLongPress, onTabPress });
    useIsomorphicLayoutEffect(() => {
        latestProps.current = { items, onTabChange, onTabLongPress, onTabPress };
    });

    const handleTabChange = useCallback((index: number) => {
        const { items: currentItems, onTabChange: onChange } = latestProps.current;
        const item = currentItems[index];
        if (item) {
            setUncontrolledSelectedIndex(index);
            onChange?.({ index, item });
        }
    }, []);
    const handleTabLongPress = useCallback((index: number) => {
        const { items: currentItems, onTabLongPress: onLongPress } = latestProps.current;
        const item = currentItems[index];
        if (item) {
            onLongPress?.({ index, item });
        }
    }, []);
    const handleTabPress = useCallback((index: number) => {
        const { items: currentItems, onTabPress: onPress } = latestProps.current;
        const item = currentItems[index];
        if (item) {
            return onPress?.({ index, item });
        }

        return false;
    }, []);

    return {
        handleTabChange,
        longPressHandler: onTabLongPress ? handleTabLongPress : undefined,
        pressHandler: onTabPress ? handleTabPress : undefined,
        uncontrolledSelectedIndex,
    };
};
