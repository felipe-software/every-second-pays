import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, View, type ViewStyle } from "react-native";
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

import { useSquash } from "./use-squash";

const PRESS_DURATION = 80;

/** Width of the edge-colored outline around every raised face. */
export const RAISED_OUTLINE = 1;

/** Faces with their own edge token; the edge is always derived from the face. */
export type RaisedTone = "row" | "active" | "fill" | "canvas" | "raised" | "chip" | "danger" | "accent";

const FACE_TOKENS = {
    row: "row",
    active: "active",
    fill: "fill",
    canvas: "canvas",
    raised: "raised",
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
    chip: "edgeChip",
    danger: "edgeDanger",
    accent: "edgeAccent",
} as const;

/** 2 for small controls, 3 for chips and rows, 4 for primary buttons and large cards. */
export type RaisedDepth = 2 | 3 | 4;

type RaisedProps = {
    /**
     * A palette face, or explicit colors for controls painted in another palette (theme
     * previews, color swatches). Faces must be opaque: the edge sits right behind them.
     */
    surface: RaisedTone | { face: string; edge: string };
    depth?: RaisedDepth;
    /** Not raised: no outline and no edge, and pressing doesn't sink it. Keeps the same footprint. */
    flat?: boolean;
    radius: number;
    /** Plays the squash-and-spring when it turns on. */
    selected?: boolean;
    /** Plays the squash-and-spring whenever this value changes. */
    squashKey?: unknown;
    /** Sinks the face while pressed; see `usePressSink`. */
    pressed?: SharedValue<number>;
    className?: string;
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
};

/**
 * A raised surface: the face has a 1 px outline in its edge color and sits on the same
 * shape in that color, offset down by `depth`, so the edge shows all around and thicker
 * along the bottom. Pressing slides the face down over the edge; the outline stays.
 * Room for the edge is reserved below the face, so sinking never moves anything around it.
 */
export function Raised({
    surface,
    depth = 3,
    flat = false,
    radius,
    selected,
    squashKey,
    pressed,
    className,
    style,
    children,
}: RaisedProps) {
    const { colors } = useEarningsTheme();
    const face = typeof surface === "string" ? colors[FACE_TOKENS[surface]] : surface.face;
    const edge = typeof surface === "string" ? colors[EDGE_TOKENS[surface]] : surface.edge;
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
                        // A flat face keeps an invisible outline so its content never shifts
                        // when it becomes raised (e.g. a preset getting selected).
                        borderColor: flat ? face : edge,
                        backgroundColor: face,
                    },
                    style,
                    sinkStyle,
                ]}
            >
                {children}
            </Animated.View>
        </Animated.View>
    );
}

/**
 * Press tracking for a raised surface: sinks the face and plays a light haptic as the finger
 * lands. Use it directly when the pressable is bigger than the surface, e.g. a preview card
 * with a caption underneath, or a strip of toggles that sink together: spread the handlers on
 * the pressable(s) and hand `pressed` to the `Raised` surface.
 */
export function usePressSink() {
    const pressed = useSharedValue(0);
    const sink = (value: number) => pressed.set(withTiming(value, {
        duration: PRESS_DURATION,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
    }));
    const onPressIn = () => {
        appHaptics.press();
        sink(1);
    };
    return { pressed, onPressIn, onPressOut: () => sink(0) };
}

/** A raised button that sinks into its edge while pressed. */
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
}: Omit<RaisedProps, "pressed"> & Omit<PressableProps, "style" | "children"> & {
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
                sink.onPressIn();
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
                className={className}
                style={style}
            >
                {children}
            </Raised>
        </Pressable>
    );
}
