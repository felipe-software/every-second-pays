import { type ReactNode, useEffect } from "react";
import Animated, {
    interpolate,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
} from "react-native-reanimated";

/**
 * Fades its content in while it springs up a few points on mount. Driven by a shared value
 * rather than a layout animation, so it also plays inside native sheets.
 */
export function RiseIn({ delay = 0, distance = 10, children }: { delay?: number; distance?: number; children: ReactNode }) {
    const progress = useSharedValue(0);
    const style = useAnimatedStyle(() => ({
        opacity: interpolate(progress.get(), [0, 0.6], [0, 1], "clamp"),
        transform: [{ translateY: (1 - progress.get()) * distance }],
    }));

    useEffect(() => {
        progress.set(withDelay(
            delay,
            withSpring(1, { damping: 14, stiffness: 190, mass: 0.8, reduceMotion: ReduceMotion.System }),
            ReduceMotion.System,
        ));
    }, [delay, progress]);

    return <Animated.View style={style}>{children}</Animated.View>;
}
