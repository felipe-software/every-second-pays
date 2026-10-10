import { StyleSheet } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";

import { useI18n } from "@/features/i18n/i18n";

import { type Stage, WEEK } from "./intro-timeline";
import { useOnboardingTheme } from "./look";
import { EASE_SPRING } from "./motion";

/**
 * The words the intro's illustration needs in the reader's own format: the day's first and last
 * hour, and the week's day letters, which move up over the calendar when the week becomes a month.
 */
export function IntroLabels({ stage, shift }: { stage: Stage; shift: SharedValue<number> }) {
    const { colors } = useOnboardingTheme();
    const shifted = useAnimatedStyle(() => ({ transform: [{ translateY: shift.get() }] }));
    const { weekdayName, formatHour } = useI18n();
    const showDays = stage === 2 || stage === 3;
    const hourFade = { opacity: stage === 1 ? 1 : 0, transitionProperty: "opacity", transitionDuration: 420 } as const;

    return (
        <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[StyleSheet.absoluteFill, shifted]}
        >
            <Animated.Text style={[styles.hour, { left: 41, color: colors.muted }, hourFade]}>
                {formatHour(9 * 60)}
            </Animated.Text>
            <Animated.Text style={[styles.hour, { left: 311, width: 60, textAlign: "right", color: colors.muted }, hourFade]}>
                {formatHour(17 * 60)}
            </Animated.Text>
            {Array.from({ length: 7 }, (_, column) => (
                <Animated.Text
                    key={column}
                    style={[styles.day, {
                        left: WEEK.x0 + WEEK.dx * column - 20,
                        color: colors.muted,
                        opacity: showDays ? (column >= 5 ? 0.55 : 1) : 0,
                        // Moved by a transform, not `top`, so the move doesn't lay out every frame.
                        transform: [{ translateY: stage >= 3 ? MONTH_DAYS_TOP - WEEK_DAYS_TOP : 0 }],
                        transitionProperty: ["transform", "opacity"],
                        transitionDuration: [820, 420],
                        transitionTimingFunction: [EASE_SPRING, "ease"],
                        transitionDelay: column * 20,
                    }]}
                >
                    {/* Monday first: the work week reads as one run, the weekend after it. */}
                    {weekdayName((column + 1) % 7, "narrow")}
                </Animated.Text>
            ))}
        </Animated.View>
    );
}

/** Where the day letters sit under the week's columns, and over the month's calendar. */
const WEEK_DAYS_TOP = 530;
const MONTH_DAYS_TOP = 296;

const styles = StyleSheet.create({
    hour: {
        position: "absolute",
        top: 470,
        fontFamily: "Archivo-Medium",
        fontSize: 12,
    },
    day: {
        position: "absolute",
        top: WEEK_DAYS_TOP,
        width: 40,
        textAlign: "center",
        fontFamily: "Archivo-SemiBold",
        fontSize: 12,
    },
});
