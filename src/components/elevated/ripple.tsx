import { type RefObject, useRef } from "react";
import {
    codegenNativeCommands,
    type GestureResponderEvent,
    Platform,
    type PressableAndroidRippleConfig,
    processColor,
    StyleSheet,
    View,
} from "react-native";

type RippleCommands = {
    hotspotUpdate: (view: View, x: number, y: number) => void;
    setPressed: (view: View, pressed: boolean) => void;
};

// react-native-web has no codegenNativeCommands.
const Commands = Platform.OS === "android"
    ? codegenNativeCommands<RippleCommands>({ supportedCommands: ["hotspotUpdate", "setPressed"] })
    : null;

const rippleColor = (ink: string) => `${ink}26`;

export function rippleConfig(ink: string, circleRadius?: number): PressableAndroidRippleConfig {
    return circleRadius === undefined
        ? { color: rippleColor(ink), foreground: true }
        : { color: rippleColor(ink), borderless: true, radius: circleRadius };
}

export function useRippleOverlay() {
    const overlay = useRef<View>(null);
    return {
        overlay,
        show(event?: GestureResponderEvent) {
            const view = overlay.current;
            if (!view || !event || !Commands) return;
            const { pageX, pageY } = event.nativeEvent;
            view.measure((_x, _y, width, height, left, top) => {
                const x = pageX - left;
                const y = pageY - top;
                const inside = x >= 0 && x <= width && y >= 0 && y <= height;
                Commands.hotspotUpdate(view, inside ? x : width / 2, inside ? y : height / 2);
                Commands.setPressed(view, true);
            });
        },
        hide() {
            if (overlay.current) Commands?.setPressed(overlay.current, false);
        },
    };
}

// Android only clips a ripple to rounded corners through a parent, and clipping the Pressable itself
// would cut off its hitSlop, so the Pressable keeps the touches and drives this layer inside the face.
export function RippleOverlay({ overlay, radius, ink }: { overlay: RefObject<View | null>; radius: number; ink: string }) {
    if (Platform.OS !== "android") return null;
    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}>
            <View
                ref={overlay}
                collapsable={false}
                // Untyped, but what android_ripple sets: a Pressable here would be a second, unlabeled TalkBack target.
                {...{ nativeForegroundAndroid: { type: "RippleAndroid", color: processColor(rippleColor(ink)), borderless: false } }}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
}
