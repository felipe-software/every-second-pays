import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { FREQUENCIES, HOUR_PRESETS, type Frequency, type PaymentDraft, type Shift, hoursPerDay, sameShifts } from "./model";
import { ChoiceChip, HoursChoice, NativeField, SystemTimeInput } from "./payment-sheet-controls";
import { useEarningsTheme } from "./theme";

export type PaymentToken = "name" | "amount" | "frequency" | "days" | "hours" | "when";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_SETS = [
    { id: "weekdays", days: [1, 2, 3, 4, 5] },
    { id: "weekends", days: [0, 6] },
    { id: "everyDay", days: [0, 1, 2, 3, 4, 5, 6] },
] as const;

const FREQUENCY_KEYS: Record<Frequency, TranslationKey> = {
    hour: "payment.frequency.hour",
    week: "payment.frequency.week",
    month: "payment.frequency.month",
    year: "payment.frequency.year",
    second: "payment.frequency.second",
    once: "payment.frequency.once",
};

const PRESET_KEYS: Record<(typeof HOUR_PRESETS)[number]["id"], TranslationKey> = {
    nineToFive: "payment.preset.nineToFive",
    splitDay: "payment.preset.splitDay",
    mornings: "payment.preset.mornings",
    evenings: "payment.preset.evenings",
};

function sameDays(a: readonly number[], b: readonly number[]) {
    return [...a].sort().join() === [...b].sort().join();
}

export function PaymentEditor({
    draft,
    token,
    onTokenChange,
    onPatch,
}: {
    draft: PaymentDraft;
    token: PaymentToken;
    onTokenChange: (token: PaymentToken) => void;
    onPatch: (patch: Partial<PaymentDraft>) => void;
}) {
    const { colors } = useEarningsTheme();
    const { t, locale, formatNumber, weekdayName } = useI18n();
    const [customHours, setCustomHours] = useState(() =>
        !HOUR_PRESETS.some((preset) => sameShifts(draft.shifts, preset.shifts)),
    );

    const patchShift = (index: number, patch: Partial<Shift>) => {
        setCustomHours(true);
        onPatch({
            shifts: draft.shifts.map((shift, shiftIndex) => shiftIndex === index ? { ...shift, ...patch } : shift),
        });
    };

    if (token === "name") {
        return <NativeField value={draft.name} onChangeText={(name) => onPatch({ name })} placeholder={t("payment.companyPlaceholder")} />;
    }

    if (token === "amount") {
        return (
            <View className="flex-row items-center gap-2">
                <Text className="font-sans text-[32px] font-bold text-muted">$</Text>
                <View className="flex-1">
                    <NativeField
                        value={draft.amount}
                        onChangeText={(amount) => onPatch({ amount: amount.replace(/[^0-9.,]/g, "") })}
                        placeholder="0"
                        numeric
                        large
                    />
                </View>
            </View>
        );
    }

    if (token === "frequency") {
        return (
            <View className="gap-2.5">
                <Text className="font-sans text-[10.5px] font-semibold tracking-[1.25px] text-muted uppercase">{t("payment.paidPer")}</Text>
                <View className="flex-row flex-wrap gap-2">
                    {FREQUENCIES.map((frequency) => (
                        <ChoiceChip
                            key={frequency}
                            label={t(FREQUENCY_KEYS[frequency])}
                            wide
                            selected={draft.frequency === frequency}
                            onPress={() => {
                                onPatch({ frequency });
                                if (frequency === "once") onTokenChange("when");
                            }}
                        />
                    ))}
                </View>
            </View>
        );
    }

    if (token === "when") {
        return (
            <View className="flex-row flex-wrap gap-2">
                {(["today", "later"] as const).map((when) => (
                    <ChoiceChip
                        key={when}
                        label={t(when === "today" ? "payment.when.today" : "payment.when.later")}
                        selected={draft.when === when}
                        onPress={() => onPatch({ when })}
                    />
                ))}
            </View>
        );
    }

    if (token === "days") {
        return (
            <View className="gap-4">
                <View className="h-14 flex-row overflow-hidden rounded-[14px] bg-choice">
                    {DAY_ORDER.map((day) => {
                        const selected = draft.days.includes(day);
                        return (
                            <Pressable
                                key={day}
                                accessibilityLabel={weekdayName(day, "long")}
                                accessibilityState={{ selected }}
                                onPress={() => onPatch({ days: selected ? draft.days.filter((value) => value !== day) : [...draft.days, day].sort() })}
                                className="flex-1 items-center justify-center active:opacity-75"
                                style={{ backgroundColor: selected ? colors.accent : "transparent" }}
                            >
                                <Text className="font-sans text-[14px] font-semibold" style={{ color: selected ? colors.ink : colors.muted }}>
                                    {weekdayName(day, "narrow").toLocaleUpperCase(locale)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
                <View className="flex-row items-baseline gap-4 px-0.5">
                    {DAY_SETS.map((option) => {
                        const selected = sameDays(option.days, draft.days);
                        return (
                            <Pressable key={option.id} onPress={() => onPatch({ days: [...option.days] })} className="active:opacity-60">
                                <Text className="font-sans text-[12.5px] font-semibold underline" style={{ color: selected ? colors.accentDeep : colors.muted }}>
                                    {t(`payment.daySet.${option.id}` as TranslationKey)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        );
    }

    const matchingPreset = HOUR_PRESETS.find((preset) => sameShifts(draft.shifts, preset.shifts));
    return (
        <View className="gap-2.5">
            {HOUR_PRESETS.map((preset) => {
                const selected = !customHours && matchingPreset?.id === preset.id;
                const hours = hoursPerDay({ shifts: preset.shifts });
                return (
                    <HoursChoice
                        key={preset.id}
                        label={t(PRESET_KEYS[preset.id])}
                        detail={t("payment.hoursPerDay", {
                            hours: formatNumber(hours, { maximumFractionDigits: 1 }),
                        })}
                        shifts={preset.shifts}
                        selected={selected}
                        onPress={() => {
                            setCustomHours(false);
                            onPatch({ shifts: preset.shifts.map((item) => ({ ...item })) });
                        }}
                    />
                );
            })}
            <HoursChoice
                label={t("payment.customHours")}
                detail={t("payment.hoursPerDay", {
                    hours: formatNumber(hoursPerDay(draft), { maximumFractionDigits: 1 }),
                })}
                shifts={draft.shifts}
                selected={customHours || !matchingPreset}
                onPress={() => setCustomHours(true)}
            />
            {customHours || !matchingPreset ? (
                <View className="gap-3 pt-1">
                    {draft.shifts.map((shift, index) => (
                        <View key={`${index}-${shift.start}-${shift.end}`} className="flex-row items-end gap-2">
                            <SystemTimeInput
                                label={t("payment.start")}
                                value={shift.start}
                                onChange={(start) => patchShift(index, { start: Math.min(shift.end - 15, start) })}
                            />
                            <SystemTimeInput
                                label={t("payment.end")}
                                value={shift.end}
                                onChange={(selectedEnd) => {
                                    const end = selectedEnd === 0 ? 1440 : selectedEnd;
                                    patchShift(index, { end: Math.max(shift.start + 15, end) });
                                }}
                            />
                            <Pressable
                                accessibilityLabel={t("payment.removeTimeBlock")}
                                disabled={draft.shifts.length === 1}
                                onPress={() => onPatch({ shifts: draft.shifts.filter((_, shiftIndex) => shiftIndex !== index) })}
                                className="mb-1.5 h-8 w-8 items-center justify-center rounded-full bg-soft active:opacity-60"
                                style={{ opacity: draft.shifts.length === 1 ? 0.35 : 1 }}
                            >
                                <Text className="font-sans text-[16px] text-muted">×</Text>
                            </Pressable>
                        </View>
                    ))}
                    <Pressable
                        onPress={() => onPatch({ shifts: [...draft.shifts, { start: 780, end: 1020 }] })}
                        className="self-start px-0.5 py-1 active:opacity-60"
                    >
                        <Text className="font-sans text-[12.5px] font-semibold text-accent-deep">{t("payment.addTimeBlock")}</Text>
                    </Pressable>
                </View>
            ) : null}
        </View>
    );
}
