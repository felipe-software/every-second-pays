import { type ReactNode, useEffect } from "react";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

/** Scales its content in with a little overshoot when `visible` turns on (e.g. check marks). */
export function PopIn({ visible, children }: { visible: boolean; children: ReactNode }) {
    const scale = useSharedValue(visible ? 1 : 0);
    const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

    useEffect(() => {
        scale.set(withSpring(visible ? 1 : 0, { damping: 10, stiffness: 320, reduceMotion: ReduceMotion.System }));
    }, [scale, visible]);

    return <Animated.View style={style}>{children}</Animated.View>;
}
