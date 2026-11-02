import { useCallback, useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import { RaisedPressable } from "@/components/elevated/raised";
import { RiseIn } from "@/components/elevated/rise-in";
import { type Currency, currencyPrefix } from "@/features/currency/currencies";
import { withTallDollar } from "@/features/currency/currency-text";
import { useI18n } from "@/features/i18n/i18n";
import { appHaptics } from "@/features/haptics/haptics";

import { LiveDot } from "./live-dot";
import { type PaymentSource, type Shift, currentShift, isSameDay } from "./model";

const ROW_STAGGER = 60;
const MAX_ROW_DELAY = 480;

const landingDateFormats = new Map<string, Intl.DateTimeFormat>();

function formatLandingDate(timestamp: number, now: Date, locale: string) {
    const date = new Date(timestamp);
    const withYear = date.getFullYear() !== now.getFullYear();
    const key = `${locale}|${withYear}`;
    let format = landingDateFormats.get(key);
    if (!format) {
        const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
        if (withYear) options.year = "numeric";
        format = new Intl.DateTimeFormat(locale, options);
        landingDateFormats.set(key, format);
    }
    return format.format(date);
}

type Translate = ReturnType<typeof useI18n>["t"];
type FormatTime = ReturnType<typeof useI18n>["formatTime"];

function oneOffSubtitle(source: PaymentSource, now: Date, t: Translate, locale: string) {
    if (source.when !== "today") return t("home.scheduled");
    if (source.paidAt == null || isSameDay(source.paidAt, now)) return t("home.landedToday");
    return t("home.landedOn", { date: formatLandingDate(source.paidAt, now, locale) });
}

function stateLabel(source: PaymentSource, shift: Shift | undefined, t: Translate, formatTime: FormatTime) {
    if (source.frequency === "once") return t(source.when === "today" ? "home.paid" : "home.scheduled");
    if (shift) return t("home.until", { time: formatTime(shift.end) });
    return t("home.idle");
}

export function SourceRow({
    source,
    currency,
    index,
    now,
    earned,
    onPress,
    onValueNodeChange,
    transferId,
    transferDelay,
}: {
    source: PaymentSource;
    currency: Currency;
    index: number;
    now: Date;
    earned: number;
    onPress: () => void;
    onValueNodeChange: (sourceId: number, node: View | null) => void;
    transferId: number | null;
    transferDelay: number;
}) {
    const { t, locale, formatDays, formatMoney, formatTime } = useI18n();
    const shift = currentShift(source, now);
    const active = Boolean(shift);
    const weekdays = source.days.length === 5 && [1, 2, 3, 4, 5].every((day) => source.days.includes(day));
    const days = weekdays ? t("home.weekdays") : formatDays(source.days);
    const schedule = `${days} · ${source.shifts.map((item) => `${formatTime(item.start)}-${formatTime(item.end)}`).join(", ")}`;
    const subtitle = source.frequency === "once" ? oneOffSubtitle(source, now, t, locale) : schedule;
    const state = stateLabel(source, shift, t, formatTime);
    const setValueNode = useCallback(
        (node: View | null) => onValueNodeChange(source.id, node),
        [onValueNodeChange, source.id],
    );
    const launchPulse = useSharedValue(0);
    const launchStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: launchPulse.get() * -3 }, { scale: 1 + launchPulse.get() * 0.07 }],
    }));

    useEffect(() => {
        if (!transferId) return undefined;

        cancelAnimation(launchPulse);
        launchPulse.set(0);
        launchPulse.set(
            withDelay(
                transferDelay,
                withSequence(
                    ReduceMotion.System,
                    withTiming(1, {
                        duration: 90,
                        easing: Easing.out(Easing.quad),
                        reduceMotion: ReduceMotion.System,
                    }),
                    withSpring(0, {
                        damping: 12,
                        mass: 0.5,
                        stiffness: 230,
                        reduceMotion: ReduceMotion.System,
                    }),
                ),
                ReduceMotion.System,
            ),
        );

        return () => cancelAnimation(launchPulse);
    }, [launchPulse, transferDelay, transferId]);

    return (
        <RiseIn delay={Math.min(index * ROW_STAGGER, MAX_ROW_DELAY) + 120} distance={12}>
            <RaisedPressable
                accessibilityRole="button"
                accessibilityLabel={t("home.editSource", { name: source.name })}
                onPress={() => {
                    appHaptics.secondaryAction();
                    onPress();
                }}
                surface={active ? "active" : "card"}
                depth={3}
                radius={16}
                className="flex-row items-start gap-[18px] px-5 py-[18px]"
            >
                <View className="min-w-0 flex-1 gap-1.5">
                    <Text numberOfLines={1} className="font-sans text-[17px] font-semibold tracking-[-0.25px] text-ink">
                        {source.name}
                    </Text>
                    <Text numberOfLines={1} className="font-sans text-[12.5px] text-muted tabular-nums">
                        {subtitle}
                    </Text>
                </View>
                <View className="items-end gap-1.5">
                    <View ref={setValueNode} collapsable={false} testID={`source-value-${source.id}`}>
                        <Animated.View style={launchStyle}>
                            <Text
                                className={`font-sans text-[17px] font-semibold ${active || source.frequency === "once" ? "text-ink" : "text-muted"}`}
                            >
                                {withTallDollar(`${currencyPrefix(currency)}${formatMoney(earned)}`, 17)}
                            </Text>
                        </Animated.View>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        {active ? <LiveDot live size={6} /> : null}
                        <Text
                            className={`font-sans text-[12px] font-medium tabular-nums ${active ? "text-accent-deep" : "text-muted"}`}
                        >
                            {state}
                        </Text>
                    </View>
                </View>
            </RaisedPressable>
        </RiseIn>
    );
}
