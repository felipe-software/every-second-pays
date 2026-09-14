import { Pressable, Text, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";

import { type PaymentSource, currentShift, earnedToday } from "./model";

export function SourceRow({ source, now, onPress }: { source: PaymentSource; now: Date; onPress: () => void }) {
    const { t, formatDays, formatMoney, formatTime } = useI18n();
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

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("home.editSource", { name: source.name })}
            onPress={onPress}
            className={`flex-row items-start gap-[18px] rounded-2xl px-5 py-[18px] active:opacity-75 ${active ? "bg-active" : "bg-row"}`}
        >
            <View className="min-w-0 flex-1 gap-1.5">
                <Text numberOfLines={1} className="font-sans text-[17px] font-semibold tracking-[-0.25px] text-ink">
                    {source.name}
                </Text>
                <Text numberOfLines={1} className="font-sans text-[12.5px] text-muted">{subtitle}</Text>
            </View>
            <View className="items-end gap-1.5">
                <Text className={`font-sans text-[17px] font-semibold ${active || source.frequency === "once" ? "text-ink" : "text-muted"}`}>
                    ${formatMoney(earnedToday(source, now))}
                </Text>
                <Text className={`font-sans text-[12px] font-medium ${active ? "text-accent-deep" : "text-muted"}`}>{state}</Text>
            </View>
        </Pressable>
    );
}
