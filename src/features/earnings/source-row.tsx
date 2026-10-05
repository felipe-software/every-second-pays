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
import { useI18n } from "@/features/i18n/i18n";
import { appHaptics } from "@/features/haptics/haptics";

import { LiveDot } from "./live-dot";
import { type PaymentSource, currentShift, isSameDay } from "./model";

const ROW_STAGGER = 60;
const MAX_ROW_DELAY = 480;

function formatLandingDate(timestamp: number, now: Date, locale: string) {
    const date = new Date(timestamp);
    return date.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" as const }),
    });
}

export function SourceRow({
    source,
    index,
    now,
    earned,
    onPress,
    onValueNodeChange,
    transferId,
    transferDelay,
}: {
    source: PaymentSource;
    /** Position in the list, used to stagger the rows rising in. */
    index: number;
    now: Date;
    /** What the source earned in the selected period. */
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
    const schedule = `${days} · ${source.shifts.map((item) => `${formatTime(item.start)}–${formatTime(item.end)}`).join(", ")}`;
    const subtitle = source.frequency !== "once"
        ? schedule
        : source.when !== "today"
            ? t("home.scheduled")
            // Payments saved before landing dates were recorded keep saying "today".
            : source.paidAt == null || isSameDay(source.paidAt, now)
                ? t("home.landedToday")
                : t("home.landedOn", { date: formatLandingDate(source.paidAt, now, locale) });
    const state = source.frequency === "once"
        ? t(source.when === "today" ? "home.paid" : "home.scheduled")
        : shift
            ? t("home.until", { time: formatTime(shift.end) })
            : t("home.idle");
    const setValueNode = useCallback(
        (node: View | null) => onValueNodeChange(source.id, node),
        [onValueNodeChange, source.id],
    );
    const launchPulse = useSharedValue(0);
    const launchStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: launchPulse.get() * -3 },
            { scale: 1 + launchPulse.get() * 0.07 },
        ],
    }));

    useEffect(() => {
        if (!transferId) return;

        cancelAnimation(launchPulse);
        launchPulse.set(0);
        launchPulse.set(withDelay(
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
        ));

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
                surface={active ? "active" : "row"}
                depth={3}
                radius={16}
                className="flex-row items-start gap-[18px] px-5 py-[18px]"
            >
                <View className="min-w-0 flex-1 gap-1.5">
                    <Text numberOfLines={1} className="font-sans text-[17px] font-semibold tracking-[-0.25px] text-ink">
                        {source.name}
                    </Text>
                    <Text numberOfLines={1} className="font-sans text-[12.5px] text-muted">{subtitle}</Text>
                </View>
                <View className="items-end gap-1.5">
                    <View ref={setValueNode} collapsable={false} testID={`source-value-${source.id}`}>
                        <Animated.View style={launchStyle}>
                            <Text className={`font-sans text-[17px] font-semibold ${active || source.frequency === "once" ? "text-ink" : "text-muted"}`}>
                                ${formatMoney(earned)}
                            </Text>
                        </Animated.View>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        {active ? <LiveDot live size={6} /> : null}
                        <Text className={`font-sans text-[12px] font-medium ${active ? "text-accent-deep" : "text-muted"}`}>{state}</Text>
                    </View>
                </View>
            </RaisedPressable>
        </RiseIn>
    );
}
