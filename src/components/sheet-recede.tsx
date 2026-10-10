import { ReanimatedTrueSheet, useReanimatedTrueSheet } from "@lodev09/react-native-true-sheet/reanimated";
import { type ComponentProps, type PropsWithChildren, useEffect, useState } from "react";
import { type ColorValue, Platform, StyleSheet } from "react-native";
import Animated, {
    Extrapolation,
    interpolate,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useDerivedValue,
    withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// iOS page sheets already recede the presenting screen natively.
export const SHEET_RECEDE_ENABLED = Platform.OS === "android";
export const SHEET_RECEDE_BACKDROP = "#000000";

const RECEDED_SCALE = 0.92;
const RECEDED_RADIUS = 28;
const SHEET_CORNER_RADIUS = 32;

type SheetRecedeProps = PropsWithChildren<{
    backgroundColor: ColorValue;
}>;

function useRecedeProgress() {
    const { animatedIndex } = useReanimatedTrueSheet();
    return useDerivedValue(() => interpolate(animatedIndex.get(), [-1, 0], [0, 1], Extrapolation.CLAMP));
}

function useProgressAbove(progress: SharedValue<number>, threshold: number) {
    const [above, setAbove] = useState(false);

    useAnimatedReaction(
        () => progress.get() > threshold,
        (next, previous) => {
            if (next !== previous) scheduleOnRN(setAbove, next);
        },
    );

    return above;
}

export function SheetRecede({ backgroundColor, children }: SheetRecedeProps) {
    const progress = useRecedeProgress();
    const active = useProgressAbove(progress, 0);
    const recededStyle = useAnimatedStyle(() => ({
        borderRadius: progress.get() * RECEDED_RADIUS,
        transform: [{ scale: interpolate(progress.get(), [0, 1], [1, RECEDED_SCALE]) }],
    }));

    if (!SHEET_RECEDE_ENABLED) return children;

    return (
        // Reanimated can sync a stale receded frame back through React after the sheet closes, so commit a plain style at rest.
        <Animated.View style={[styles.page, { backgroundColor }, active ? recededStyle : styles.rest]}>
            {children}
        </Animated.View>
    );
}

export function RecedingSheet(props: ComponentProps<typeof ReanimatedTrueSheet>) {
    const { animatedIndex } = useReanimatedTrueSheet();

    // A sheet unmounted while presented emits no closing position, which would leave the page receded.
    useEffect(() => () => animatedIndex.set(withTiming(-1)), [animatedIndex]);

    return <ReanimatedTrueSheet cornerRadius={SHEET_RECEDE_ENABLED ? SHEET_CORNER_RADIUS : undefined} {...props} />;
}

export function useSheetReceded() {
    const progress = useRecedeProgress();
    const receded = useProgressAbove(progress, 0.5);
    return SHEET_RECEDE_ENABLED && receded;
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        overflow: "hidden",
    },
    rest: {
        borderRadius: 0,
        transform: [{ scale: 1 }],
    },
});
