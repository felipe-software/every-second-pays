import type { JellyTabBarHeadlessProps } from "../types";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";
import { useCallback, useRef } from "react";

type TabEventHandlersOptions = Pick<
    JellyTabBarHeadlessProps,
    "items" | "onTabChange" | "onTabLongPress" | "onTabPress"
> & {
    setUncontrolledSelectedIndex: (index: number) => void;
};

export const useTabEventHandlers = ({
    items,
    onTabChange,
    onTabLongPress,
    onTabPress,
    setUncontrolledSelectedIndex,
}: TabEventHandlersOptions) => {
    // Read the latest props on call, so new callback or item identities do not rebuild the gesture.
    const latestProps = useRef({
        items,
        onTabChange,
        onTabLongPress,
        onTabPress,
    });
    useIsomorphicLayoutEffect(() => {
        latestProps.current = {
            items,
            onTabChange,
            onTabLongPress,
            onTabPress,
        };
    });

    const handleTabChange = useCallback(
        (index: number) => {
            const { items: currentItems, onTabChange: onChange } = latestProps.current;
            const item = currentItems[index];
            if (item) {
                setUncontrolledSelectedIndex(index);
                onChange?.({ index, item });
            }
        },
        [setUncontrolledSelectedIndex],
    );
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

    return { handleTabChange, handleTabLongPress, handleTabPress };
};
