import { type ReactNode, useEffect } from "react";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const SHOW = { duration: 200, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };
const HIDE = { duration: 120, easing: Easing.in(Easing.quad), reduceMotion: ReduceMotion.System };

/**
 * Fades and grows its content in when `visible` turns on (e.g. check marks), and fades it
 * back out when it turns off. Eased rather than sprung, so it settles without wobbling.
 */
export function PopIn({ visible, children }: { visible: boolean; children: ReactNode }) {
    const progress = useSharedValue(visible ? 1 : 0);
    const style = useAnimatedStyle(() => ({
        opacity: progress.get(),
        transform: [{ scale: 0.6 + 0.4 * progress.get() }],
    }));

    useEffect(() => {
        progress.set(withTiming(visible ? 1 : 0, visible ? SHOW : HIDE));
    }, [progress, visible]);

    return <Animated.View style={style}>{children}</Animated.View>;
}
