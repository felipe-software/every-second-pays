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

import { ElevatedPressable } from "@/components/elevated/elevated-pressable";
import { RiseIn } from "@/components/elevated/rise-in";
import { useI18n } from "@/features/i18n/i18n";
import { appHaptics } from "@/features/haptics/haptics";

import { LiveDot } from "./live-dot";
import { type PaymentSource, currentShift, earnedToday } from "./model";
import { edgeColor, useEarningsTheme } from "./theme";

const ROW_STAGGER = 60;
const MAX_ROW_DELAY = 480;

export function SourceRow({
    source,
    index,
    now,
    onPress,
    onValueNodeChange,
    transferId,
    transferDelay,
}: {
    source: PaymentSource;
    /** Position in the list, used to stagger the rows rising in. */
    index: number;
    now: Date;
    onPress: () => void;
    onValueNodeChange: (sourceId: number, node: View | null) => void;
    transferId: number | null;
    transferDelay: number;
}) {
    const { t, formatDays, formatMoney, formatTime } = useI18n();
    const { colors, isDark } = useEarningsTheme();
    const shift = currentShift(source, now);
    const active = Boolean(shift);
    const weekdays = source.days.length === 5 && [1, 2, 3, 4, 5].every((day) => source.days.includes(day));
    const days = weekdays ? t("home.weekdays") : formatDays(source.days);
    const schedule = `${days} · ${source.shifts.map((item) => `${formatTime(item.start)}–${formatTime(item.end)}`).join(", ")}`;
    const subtitle = source.frequency === "once"
        ? t(source.when === "today" ? "home.landedToday" : "home.scheduled")
        : schedule;
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

    const face = active ? colors.active : colors.row;

    return (
        <RiseIn delay={Math.min(index * ROW_STAGGER, MAX_ROW_DELAY) + 120} distance={12}>
            <ElevatedPressable
                accessibilityRole="button"
                accessibilityLabel={t("home.editSource", { name: source.name })}
                onPress={() => {
                    appHaptics.secondaryAction();
                    onPress();
                }}
                face={face}
                edge={edgeColor(face, { isDark })}
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
                                ${formatMoney(earnedToday(source, now))}
                            </Text>
                        </Animated.View>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        {active ? <LiveDot live size={6} /> : null}
                        <Text className={`font-sans text-[12px] font-medium ${active ? "text-accent-deep" : "text-muted"}`}>{state}</Text>
                    </View>
                </View>
            </ElevatedPressable>
        </RiseIn>
    );
}
