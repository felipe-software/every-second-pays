import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { useWindowDimensions } from "react-native";
import { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useKeyboardBottomSpacing() {
    const { height, progress } = useReanimatedKeyboardAnimation();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    const bottomSpacingStyle = useAnimatedStyle(() => ({
        height: Math.max(Math.abs(height.value), insets.bottom),
    }));

    const sheetStyle = useAnimatedStyle(() => ({
        height: windowHeight * (0.68 + progress.value * 0.16),
    }));

    return { bottomSpacingStyle, sheetStyle };
}
