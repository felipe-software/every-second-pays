import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, View, type ViewStyle } from "react-native";
import Animated, {
    ReduceMotion,
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { useSquash } from "./use-squash";

const PRESS_DURATION = 80;

type ElevatedSurfaceProps = {
    /** Fill of the raised face. Must be opaque: the edge sits right behind it. */
    face: string;
    /** Solid bottom edge. Use `transparent` for a flat control that keeps the same footprint. */
    edge: string;
    /** Edge height in points; pressing sinks the face by exactly this much. */
    depth?: number;
    radius: number;
    /** Plays the squash-and-spring when it turns on. */
    selected?: boolean;
    className?: string;
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
};

function ElevatedLayers({
    face,
    edge,
    depth = 3,
    radius,
    selected,
    className,
    style,
    children,
    pressed,
}: ElevatedSurfaceProps & { pressed?: SharedValue<number> }) {
    const squashStyle = useSquash(selected);
    const faceStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: (pressed?.get() ?? 0) * depth }],
    }));

    // The outer box reserves room for the edge, so sinking the face never moves its neighbours.
    return (
        <Animated.View style={[{ paddingBottom: depth }, squashStyle]}>
            <View
                pointerEvents="none"
                style={{ position: "absolute", top: depth, right: 0, bottom: 0, left: 0, borderRadius: radius, backgroundColor: edge }}
            />
            <Animated.View className={className} style={[{ borderRadius: radius, backgroundColor: face }, style, faceStyle]}>
                {children}
            </Animated.View>
        </Animated.View>
    );
}

/**
 * Press tracking for a raised surface whose pressable wraps more than the surface itself,
 * e.g. a preview card with a caption underneath: spread the handlers on the pressable and
 * hand `pressed` to the `ElevatedSurface`.
 */
export function usePressSink() {
    const pressed = useSharedValue(0);
    const sink = (value: number) => pressed.set(withTiming(value, {
        duration: PRESS_DURATION,
        reduceMotion: ReduceMotion.System,
    }));
    return { pressed, onPressIn: () => sink(1), onPressOut: () => sink(0) };
}

/** A raised surface with a solid bottom edge; pass `pressed` to sink it from an outer pressable. */
export function ElevatedSurface(props: ElevatedSurfaceProps & { pressed?: SharedValue<number> }) {
    return <ElevatedLayers {...props} />;
}

/** A raised button: the face sits on a solid edge and sinks into it while pressed. */
export function ElevatedPressable({
    face,
    edge,
    depth,
    radius,
    selected,
    className,
    style,
    children,
    containerClassName,
    containerStyle,
    onPressIn,
    onPressOut,
    ...pressableProps
}: ElevatedSurfaceProps & Omit<PressableProps, "style" | "children"> & {
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
            <ElevatedLayers
                face={face}
                edge={edge}
                depth={depth}
                radius={radius}
                selected={selected}
                className={className}
                style={style}
                pressed={sink.pressed}
            >
                {children}
            </ElevatedLayers>
        </Pressable>
    );
}
