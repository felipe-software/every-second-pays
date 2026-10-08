import { NumberFlow } from "number-flow-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { css } from "react-native-reanimated";

import { useI18n } from "@/features/i18n/i18n";

import { useOnboardingTheme } from "./look";
import { EASE_BOUNCY, EASE_ROLL_FN, EASE_SOFT_FN, FADE_IN } from "./motion";

const COUNTER_IN = css.keyframes({
    from: { transform: [{ translateY: 10 }, { scale: 0.55 }] },
    to: { transform: [{ translateY: 0 }, { scale: 1 }] },
});

function absorb(peak: number, dip: number, rebound: number) {
    return css.keyframes({
        "0%": { transform: [{ scale: 1 }] },
        "8%": { transform: [{ scale: peak }] },
        "20%": { transform: [{ scale: dip }] },
        "33%": { transform: [{ scale: rebound }] },
        "47%": { transform: [{ scale: 0.985 }] },
        "61%": { transform: [{ scale: 1.04 }] },
        "78%": { transform: [{ scale: 0.997 }] },
        "100%": { transform: [{ scale: 1 }] },
    });
}

// Two copies of each, alternated per hit: swapping the animation is what restarts it.
const ABSORB = [absorb(1.12, 0.965, 1.07), absorb(1.12, 0.965, 1.07)];
const ABSORB_BIG = [absorb(1.2, 0.94, 1.11), absorb(1.2, 0.94, 1.11)];

/** How a counter answers money landing in it: a squash-and-stretch, replayed per hit. */
export function absorbAnimation(hits: number, big = false, duration = big ? 1500 : 1150) {
    if (!hits) return null;
    return {
        animationName: (big ? ABSORB_BIG : ABSORB)[hits % 2],
        animationDuration: duration,
        animationTimingFunction: "ease-in-out" as const,
    };
}

const ROLL = { duration: 700, easing: EASE_ROLL_FN };
const RESIZE = { duration: 720, easing: EASE_SOFT_FN };

export type Period = "day" | "week" | "month" | "year";

const PERIOD_KEYS = {
    day: "onboarding.perDay",
    week: "onboarding.perWeek",
    month: "onboarding.perMonth",
    year: "onboarding.perYear",
} as const;

/** The intro's big total, with the period it adds up over spelled in underneath. */
export function IntroCounter({
    visible,
    money,
    period,
    hits,
    big,
}: {
    visible: boolean;
    money: number;
    period: Period | null;
    hits: number;
    big: boolean;
}) {
    const { colors } = useOnboardingTheme();
    const { t, locale, formatNumber } = useI18n();
    const periodText = period ? t(PERIOD_KEYS[period]) : "";

    return (
        <View pointerEvents="none" style={styles.wrap}>
            {visible ? (
                <Animated.View
                    accessible
                    accessibilityLiveRegion="polite"
                    accessibilityLabel={period
                        ? t("onboarding.counterExample", { amount: formatNumber(money), period: periodText })
                        : undefined}
                    style={{
                        animationName: [COUNTER_IN, FADE_IN],
                        animationDuration: [1000, 420],
                        animationTimingFunction: [EASE_BOUNCY, "ease-out"],
                        animationFillMode: "both",
                    }}
                >
                    <Animated.View style={[styles.counter, absorbAnimation(hits, big)]}>
                        <Text style={[styles.currency, { color: colors.muted }]}>$</Text>
                        {/* NumberFlow's own window is taller than the digits; rolling neighbors would show around them. */}
                        <View style={styles.window}>
                            <NumberFlow
                                value={money}
                                mask
                                locales={locale}
                                format={{ maximumFractionDigits: 0 }}
                                trend={1}
                                spinTiming={ROLL}
                                transformTiming={RESIZE}
                                style={{ ...NUMBER_STYLE, color: colors.ink }}
                            />
                        </View>
                    </Animated.View>
                </Animated.View>
            ) : null}
            <PeriodWord text={periodText} color={colors.accentDeep} />
        </View>
    );
}

const letterRules = new Map<number, ReturnType<typeof css.keyframes>>();

/** Each letter drops in from its own height and tilt; the pattern repeats per position. */
function letterKeyframes(index: number) {
    let rule = letterRules.get(index);
    if (!rule) {
        const tilt = (index % 2 ? 1 : -1) * (10 + ((index * 7) % 13));
        const drop = (0.7 + ((index * 3) % 4) * 0.09) * WORD_SIZE;
        rule = css.keyframes({
            from: { transform: [{ translateY: drop }, { rotate: `${tilt}deg` }, { scale: 0.3 }] },
            to: { transform: [{ translateY: 0 }, { rotate: "0deg" }, { scale: 1 }] },
        });
        letterRules.set(index, rule);
    }
    return rule;
}

const WORD_OUT = css.keyframes({
    to: { opacity: 0, transform: [{ translateY: -24 }, { scale: 0.9 }] },
});
const WORD_OUT_DURATION = 440;

function Word({ text, color, leaving }: { text: string; color: string; leaving: boolean }) {
    return (
        <Animated.View
            style={[
                styles.word,
                leaving && {
                    animationName: WORD_OUT,
                    animationDuration: WORD_OUT_DURATION,
                    animationTimingFunction: "ease-in-out",
                    animationFillMode: "forwards",
                },
            ]}
        >
            {Array.from(text).map((letter, index) => (
                <Animated.Text
                    key={index}
                    style={[styles.letter, {
                        color,
                        animationName: [letterKeyframes(index), FADE_IN],
                        animationDuration: [1000, 300],
                        animationTimingFunction: [EASE_BOUNCY, "ease-out"],
                        animationDelay: index * 38,
                        animationFillMode: "both",
                    }]}
                >
                    {letter}
                </Animated.Text>
            ))}
        </Animated.View>
    );
}

/** A word spelled in letter by letter; a new word replaces the old one as it floats away. */
function PeriodWord({ text, color }: { text: string; color: string }) {
    const [current, setCurrent] = useState({ id: 0, text });
    const [leaving, setLeaving] = useState<{ id: number; text: string } | null>(null);

    if (text !== current.text) {
        setLeaving(current.text ? current : null);
        setCurrent({ id: current.id + 1, text });
    }

    useEffect(() => {
        if (!leaving) return;
        const timer = setTimeout(() => setLeaving(null), WORD_OUT_DURATION);
        return () => clearTimeout(timer);
    }, [leaving]);

    return (
        <View style={styles.wordStage}>
            {leaving ? <Word key={leaving.id} text={leaving.text} color={color} leaving /> : null}
            {current.text ? <Word key={current.id} text={current.text} color={color} leaving={false} /> : null}
        </View>
    );
}

const WORD_SIZE = 30;
const NUMBER_STYLE = {
    fontFamily: "Archivo-Bold",
    fontSize: 72,
    fontWeight: "700",
    letterSpacing: -1,
} as const;

const styles = StyleSheet.create({
    wrap: {
        position: "absolute",
        top: 89,
        left: 0,
        right: 0,
        alignItems: "center",
    },
    window: {
        height: 84,
        justifyContent: "center",
        overflow: "hidden",
    },
    counter: {
        height: 100,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        transformOrigin: "50% 62%",
    },
    currency: {
        marginRight: 5,
        marginTop: 2,
        fontFamily: "Archivo-Medium",
        fontSize: 32,
    },
    wordStage: {
        alignSelf: "stretch",
        height: 46,
        marginTop: 2,
    },
    word: {
        ...StyleSheet.absoluteFill,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    letter: {
        fontFamily: "Archivo-SemiBold",
        fontSize: WORD_SIZE,
        letterSpacing: -0.4,
        transformOrigin: "50% 85%",
    },
});
