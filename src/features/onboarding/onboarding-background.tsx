import { memo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { css, interpolate, type SharedValue, useAnimatedStyle } from "react-native-reanimated";

import { useOnboardingTheme } from "./look";
import { glow } from "./paint";

export type PageId = "intro" | "widget" | "privacy" | "customize";

type Blob = {
    width: number;
    height: number;
    /** Center on each page, on the design artboard. */
    at: Record<PageId, [number, number]>;
    breathe: number;
    opacity: { light: number; dark: number };
    paint: (colors: { accent: string; accentDeep: string }) => string;
};

// Soft glows that drift to a new spot on every page; dragging blends between spots.
const BLOBS: Blob[] = [
    {
        width: 700,
        height: 600,
        at: { intro: [206, -40], widget: [318, 40], privacy: [206, 230], customize: [90, 20] },
        breathe: 9000,
        opacity: { light: 0.62, dark: 0.72 },
        paint: ({ accent }) => glow(accent, [0.62], [0.24, 52]),
    },
    {
        width: 560,
        height: 460,
        at: { intro: [30, 930], widget: [396, 900], privacy: [40, 850], customize: [380, 940] },
        breathe: 11000,
        opacity: { light: 0.5, dark: 0.42 },
        paint: ({ accentDeep }) => glow(accentDeep, [0.4], [0.14, 55]),
    },
    {
        width: 380,
        height: 320,
        at: { intro: [398, 560], widget: [12, 520], privacy: [392, 600], customize: [226, 650] },
        breathe: 13000,
        opacity: { light: 0.55, dark: 0.5 },
        paint: ({ accent }) => glow(accent, [0.36]),
    },
];

const BREATHE = css.keyframes({
    from: { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] },
    to: { transform: [{ translateX: 10 }, { translateY: 8 }, { scale: 1.09 }] },
});
const FLARE = css.keyframes({
    "0%": { opacity: 0, transform: [{ scale: 0.82 }] },
    "14%": { opacity: 0.7, transform: [{ scale: 1 }] },
    "100%": { opacity: 0, transform: [{ scale: 1.14 }] },
});
const FLARE_BIG = css.keyframes({
    "0%": { opacity: 0, transform: [{ scale: 0.7 }] },
    "12%": { opacity: 1, transform: [{ scale: 1.05 }] },
    "100%": { opacity: 0, transform: [{ scale: 1.35 }] },
});

function DriftingBlob({ blob, pages, position }: { blob: Blob; pages: PageId[]; position: SharedValue<number> }) {
    const { colors, isDark } = useOnboardingTheme();
    const steps = pages.map((_, index) => index);
    const xs = pages.map((page) => blob.at[page][0] - blob.width / 2);
    const ys = pages.map((page) => blob.at[page][1] - blob.height / 2);
    const style = useAnimatedStyle(() => ({
        transform: [
            { translateX: interpolate(position.get(), steps, xs, "clamp") },
            { translateY: interpolate(position.get(), steps, ys, "clamp") },
        ],
    }));

    return (
        <Animated.View
            style={[styles.blob, { width: blob.width, height: blob.height, opacity: blob.opacity[isDark ? "dark" : "light"] }, style]}
        >
            <Animated.View
                style={[StyleSheet.absoluteFill, {
                    experimental_backgroundImage: blob.paint(colors),
                    animationName: BREATHE,
                    animationDuration: blob.breathe,
                    animationIterationCount: "infinite",
                    animationDirection: "alternate",
                    animationTimingFunction: "ease-in-out",
                }]}
            />
        </Animated.View>
    );
}

/** The canvas behind the onboarding, laid out on the design artboard (`scale` fits it to the screen). */
export const OnboardingBackground = memo(function OnboardingBackground({
    pages,
    position,
    flare,
    scale,
    offsetX,
    offsetY,
}: {
    pages: PageId[];
    position: SharedValue<number>;
    /** Counts the intro's hits; each one flashes the top of the screen. */
    flare: { count: number; big: boolean };
    scale: number;
    offsetX: number;
    offsetY: number;
}) {
    const { colors } = useOnboardingTheme();
    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: colors.canvas }]}>
            <View
                style={[styles.artboard, {
                    transform: [{ translateX: offsetX }, { translateY: offsetY }, { scale }],
                }]}
            >
                {BLOBS.map((blob, index) => <DriftingBlob key={index} blob={blob} pages={pages} position={position} />)}
                {flare.count ? (
                    <Animated.View
                        key={flare.count}
                        style={[styles.flare, {
                            experimental_backgroundImage: glow(colors.accent, [0.7], [0.22, 55]),
                            animationName: flare.big ? FLARE_BIG : FLARE,
                            animationDuration: flare.big ? 1700 : 1200,
                            animationTimingFunction: "ease-out",
                            animationFillMode: "both",
                        }]}
                    />
                ) : null}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    clip: {
        overflow: "hidden",
    },
    artboard: {
        position: "absolute",
        left: 0,
        top: 0,
        width: 412,
        height: 915,
        transformOrigin: "0% 0%",
    },
    blob: {
        position: "absolute",
        left: 0,
        top: 0,
    },
    flare: {
        position: "absolute",
        left: -94,
        top: -131,
        width: 600,
        height: 540,
    },
});
