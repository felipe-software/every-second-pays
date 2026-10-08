import { createContext, type ReactNode, useContext } from "react";
import { StyleSheet } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";

type PagerContextValue = {
    /** Where the pages sit, in pages: 1.5 is halfway from the second page to the third. */
    position: SharedValue<number>;
    /** The same position, trailing behind it, for the parallax layers inside each page. */
    lagging: SharedValue<number>;
};

export const PagerContext = createContext<PagerContextValue | null>(null);

export function usePager() {
    const context = useContext(PagerContext);
    if (!context) throw new Error("usePager must be used inside the onboarding pager");
    return context;
}

/** Visual depth of a page layer: how far past the page it drifts while the page slides away. */
export const DEPTH = { art: 60, copy: 130 } as const;

/**
 * One parallax plane of a page. Each plane drifts `depth` points further than its page as
 * the page slides, and settles a beat after it, so pictures and words separate in motion.
 */
export function PageLayer({
    index,
    depth,
    zIndex,
    passThrough,
    children,
}: {
    index: number;
    depth: number;
    zIndex?: number;
    /** Lets touches through to the layers below. */
    passThrough?: boolean;
    children: ReactNode;
}) {
    const { lagging } = usePager();
    const style = useAnimatedStyle(() => ({
        transform: [{ translateX: (index - lagging.get()) * depth }],
    }));

    return (
        <Animated.View
            pointerEvents={passThrough ? "none" : "box-none"}
            style={[StyleSheet.absoluteFill, { zIndex }, style]}
        >
            {children}
        </Animated.View>
    );
}
