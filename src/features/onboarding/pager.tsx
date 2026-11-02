import { createContext, type ReactNode, useContext } from "react";
import { StyleSheet } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";

export type PagerContextValue = {
    position: SharedValue<number>;
    lagging: SharedValue<number>;
};

export const PagerContext = createContext<PagerContextValue | null>(null);

export function usePager() {
    const context = useContext(PagerContext);
    if (!context) throw new Error("usePager must be used inside the onboarding pager");
    return context;
}

export const DEPTH = { art: 60, copy: 130 } as const;

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
