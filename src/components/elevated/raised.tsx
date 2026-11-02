import type { ReactNode, RefObject } from "react";
import { type GestureResponderEvent, Pressable, type PressableProps, type StyleProp, View, type ViewStyle } from "react-native";
import Animated, {
    Easing,
    ReduceMotion,
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";

import { RippleOverlay, useRippleOverlay } from "./ripple";
import { useSquash } from "./use-squash";

const PRESS_DURATION = 80;

export const RAISED_OUTLINE = 1;

export type RaisedTone = "row" | "active" | "fill" | "canvas" | "raised" | "card" | "chip" | "danger" | "accent";

const FACE_TOKENS = {
    row: "row",
    active: "active",
    fill: "fill",
    canvas: "canvas",
    raised: "raised",
    card: "cardFace",
    chip: "chipSelected",
    danger: "dangerFace",
    accent: "accent",
} as const;

const EDGE_TOKENS = {
    row: "edgeRow",
    active: "edgeActive",
    fill: "edgeFill",
    canvas: "edgeCanvas",
    raised: "edgeRaised",
    card: "edgeRow",
    chip: "edgeChip",
    danger: "edgeDanger",
    accent: "edgeAccent",
} as const;

export type RaisedDepth = 2 | 3 | 4;

type RaisedProps = {
    /** Faces must be opaque: the edge sits right behind them. */
    surface: RaisedTone | { face: string; edge: string; outline?: string };
    depth?: RaisedDepth;
    flat?: boolean;
    radius: number;
    selected?: boolean;
    squashKey?: unknown;
    pressed?: SharedValue<number>;
    ripple?: RefObject<View | null>;
    className?: string;
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
};

export function Raised({
    surface,
    depth = 3,
    flat = false,
    radius,
    selected,
    squashKey,
    pressed,
    ripple,
    className,
    style,
    children,
}: RaisedProps) {
    const { colors } = useEarningsTheme();
    const face = typeof surface === "string" ? colors[FACE_TOKENS[surface]] : surface.face;
    const edge = typeof surface === "string" ? colors[EDGE_TOKENS[surface]] : surface.edge;
    const outline = typeof surface === "string"
        ? surface === "card" ? colors.cardOutline : edge
        : surface.outline ?? edge;
    const squashStyle = useSquash(selected, squashKey);
    const sinkStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: flat ? 0 : (pressed?.get() ?? 0) * depth }],
    }));

    return (
        <Animated.View style={[{ paddingBottom: depth + RAISED_OUTLINE }, squashStyle]}>
            {flat ? null : (
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        top: depth,
                        right: 0,
                        bottom: RAISED_OUTLINE,
                        left: 0,
                        borderRadius: radius,
                        backgroundColor: edge,
                    }}
                />
            )}
            <Animated.View
                className={className}
                style={[
                    {
                        borderRadius: radius,
                        borderWidth: RAISED_OUTLINE,
                        // A flat face keeps an invisible outline so its content doesn't shift when it becomes raised.
                        borderColor: flat ? face : outline,
                        backgroundColor: face,
                    },
                    style,
                    sinkStyle,
                ]}
            >
                {children}
                {ripple ? <RippleOverlay overlay={ripple} radius={radius - RAISED_OUTLINE} ink={colors.ink} /> : null}
            </Animated.View>
        </Animated.View>
    );
}

export function usePressSink({ haptic = true }: { haptic?: boolean } = {}) {
    const pressed = useSharedValue(0);
    const { overlay, show, hide } = useRippleOverlay();
    const sink = (value: number) => pressed.set(withTiming(value, {
        duration: PRESS_DURATION,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
    }));
    const onPressIn = (event?: GestureResponderEvent) => {
        if (haptic) appHaptics.press();
        sink(1);
        show(event);
    };
    const onPressOut = () => {
        sink(0);
        hide();
    };
    return { pressed, ripple: overlay, onPressIn, onPressOut };
}

export function RaisedPressable({
    surface,
    depth,
    flat,
    radius,
    selected,
    squashKey,
    className,
    style,
    children,
    containerClassName,
    containerStyle,
    onPressIn,
    onPressOut,
    ...pressableProps
}: Omit<RaisedProps, "pressed" | "ripple"> & Omit<PressableProps, "style" | "children"> & {
    containerClassName?: string;
    containerStyle?: StyleProp<ViewStyle>;
}) {
    const sink = usePressSink();

    return (
        <Pressable
            {...pressableProps}
            className={containerClassName}
            style={containerStyle}
            onPressIn={(event) => {
                sink.onPressIn(event);
                onPressIn?.(event);
            }}
            onPressOut={(event) => {
                sink.onPressOut();
                onPressOut?.(event);
            }}
        >
            <Raised
                surface={surface}
                depth={depth}
                flat={flat}
                radius={radius}
                selected={selected}
                squashKey={squashKey}
                pressed={sink.pressed}
                ripple={sink.ripple}
                className={className}
                style={style}
            >
                {children}
            </Raised>
        </Pressable>
    );
}
