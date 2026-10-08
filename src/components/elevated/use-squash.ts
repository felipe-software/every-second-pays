import { useEffect, useRef } from "react";
import {
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

export function useSquash(selected: boolean | undefined, key?: unknown) {
    const scale = useSharedValue(1);
    const wasSelected = useRef(selected);
    const previousKey = useRef(key);

    useEffect(() => {
        const keyChanged = key !== previousKey.current;
        if ((selected && !wasSelected.current) || keyChanged) {
            scale.set(withSequence(
                ReduceMotion.System,
                withTiming(0.93, { duration: 110, reduceMotion: ReduceMotion.System }),
                withSpring(1, { damping: 9, mass: 0.6, stiffness: 260, reduceMotion: ReduceMotion.System }),
            ));
        }
        wasSelected.current = selected;
        previousKey.current = key;
    }, [key, scale, selected]);

    return useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
}
