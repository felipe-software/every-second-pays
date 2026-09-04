import { Button as NativeButton, Host, Text as NativeText } from "@expo/ui";
import { NumberFlow } from "number-flow-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Uniwind } from "uniwind";

import { PaymentSheet, PrimaryButton } from "@/features/earnings/payment-sheet";
import {
    INITIAL_SOURCES,
    PaymentDraft,
    PaymentSource,
    currentShift,
    earnedToday,
    formatMoney,
    formatTime,
    hoursPerDay,
    labelDays,
    ratePerSecond,
} from "@/features/earnings/model";
import { useEarningsTheme } from "@/features/earnings/theme";

const ACCENT_TINTS = ["#E8763A", "#EC9060", "#F2B38E"];

function createDemoClock() {
    const date = new Date();
    date.setDate(date.getDate() + ((3 - date.getDay() + 7) % 7));
    date.setHours(14);
    return date;
}

function useLiveDemoClock() {
    const [startedAt] = useState(Date.now);
    const [demoStartedAt] = useState(() => createDemoClock().getTime());
    const [now, setNow] = useState(() => new Date(demoStartedAt));

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date(demoStartedAt + (Date.now() - startedAt)));
        }, 200);
        return () => clearInterval(timer);
    }, [demoStartedAt, startedAt]);

    return now;
}

function SourceRow({
    source,
    now,
    index,
    onPress,
}: {
    source: PaymentSource;
    now: Date;
    index: number;
    onPress: () => void;
}) {
    const shift = currentShift(source, now);
    const hours = hoursPerDay(source);
    const subtitle =
        source.frequency === "once"
            ? `One-time · ${source.when === "today" ? "landed today" : "scheduled"}`
            : shift
              ? `Working now · until ${formatTime(shift.end)}`
              : `${labelDays(source.days)} · ${Number.isInteger(hours) ? hours : hours.toFixed(1)}h a day`;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${source.name}`}
            onPress={onPress}
            className="mb-0.5 flex-row items-center gap-3 rounded-[14px] bg-raised px-3.5 py-3.5 active:opacity-70"
        >
            <View
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: shift ? "#E8763A" : ACCENT_TINTS[index % ACCENT_TINTS.length] }}
            />
            <View className="min-w-0 flex-1 gap-0.5">
                <Text numberOfLines={1} className="font-sans text-[14px] font-semibold tracking-[-0.15px] text-ink">
                    {source.name}
                </Text>
                <Text numberOfLines={1} className="font-sans text-[11px] text-muted">
                    {subtitle}
                </Text>
            </View>
            <Text
                className={`font-sans text-[14px] font-bold ${
                    shift || source.frequency === "once" ? "text-ink" : "text-muted"
                }`}
            >
                ${formatMoney(earnedToday(source, now))}
            </Text>
            <Text className="font-sans text-[20px] text-muted/60">›</Text>
        </Pressable>
    );
}

export default function EarningsScreen() {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useEarningsTheme();
    const now = useLiveDemoClock();
    const [sources, setSources] = useState<PaymentSource[]>(INITIAL_SOURCES);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const editingSource = sources.find((source) => source.id === editingId);
    const total = useMemo(
        () => sources.reduce((sum, source) => sum + earnedToday(source, now), 0),
        [now, sources],
    );
    const liveRate = useMemo(
        () =>
            sources.reduce(
                (sum, source) => sum + (currentShift(source, now) ? ratePerSecond(source) : 0),
                0,
            ),
        [now, sources],
    );
    const displayTotal = Math.round(total * 100) / 100;
    const whole = Math.floor(displayTotal);
    const cents = Math.round((displayTotal - whole) * 100) % 100;

    const openNewSource = () => {
        setEditingId(null);
        setSheetOpen(true);
    };

    const closeSheet = () => {
        setSheetOpen(false);
        setEditingId(null);
    };

    const saveSource = (draft: PaymentDraft, id?: number) => {
        const record: PaymentSource = {
            ...draft,
            id: id ?? Math.max(0, ...sources.map((source) => source.id)) + 1,
            amount: Number(draft.amount),
            days: [...draft.days],
            shifts: draft.shifts.map((shift) => ({ ...shift })),
        };
        setSources((current) =>
            id == null ? [...current, record] : current.map((source) => (source.id === id ? record : source)),
        );
        closeSheet();
    };

    return (
        <View className="flex-1 bg-canvas">
            <StatusBar style={isDark ? "light" : "dark"} />
            <View className="absolute -top-52 left-1/2 h-[430px] w-[560px] -translate-x-1/2 rounded-full bg-[#f8c9ad]/25 dark:bg-accent/15" />

            <View
                accessible
                accessibilityLabel={isDark ? "Use light theme" : "Use dark theme"}
                accessibilityRole="button"
                className="absolute left-[18px] z-10 h-11 w-11"
                style={{ top: insets.top + 12 }}
            >
                <Host style={{ width: 44, height: 44 }}>
                    <NativeButton
                        onPress={() => Uniwind.setTheme(isDark ? "light" : "dark")}
                        testID="theme-toggle"
                        variant="text"
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: colors.field,
                        }}
                    >
                        <NativeText
                            textStyle={{
                                color: colors.ink,
                                fontSize: 19,
                                fontWeight: "600",
                            }}
                        >
                            {isDark ? "☀" : "☾"}
                        </NativeText>
                    </NativeButton>
                </Host>
            </View>

            <View className="flex-1" style={{ paddingTop: insets.top }}>
                <View className="items-center pt-[84px]">
                    <View className="h-[94px] flex-row items-start justify-center">
                        <Text className="mt-7 mr-1 font-sans text-[30px] font-medium text-muted">$</Text>
                        <View className="h-[86px] overflow-hidden">
                            <NumberFlow
                                value={whole}
                                mask={true}
                                locales="en-US"
                                format={{ maximumFractionDigits: 0 }}
                                trend={1}
                                style={{
                                    color: colors.ink,
                                    fontFamily: "Archivo-Bold",
                                    fontSize: 80,
                                    fontWeight: "700",
                                    letterSpacing: -4,
                                    lineHeight: 86,
                                }}
                            />
                        </View>
                        <Text className="mt-12 font-sans text-[34px] font-semibold tracking-[-1px] text-muted">.</Text>
                        <View className="mt-10 h-[42px] overflow-hidden">
                            <NumberFlow
                                value={cents}
                                mask={true}
                                locales="en-US"
                                format={{ minimumIntegerDigits: 2, maximumFractionDigits: 0, useGrouping: false }}
                                trend={1}
                                style={{
                                    color: colors.muted,
                                    fontFamily: "Archivo-SemiBold",
                                    fontSize: 34,
                                    fontWeight: "600",
                                    letterSpacing: -1,
                                    lineHeight: 42,
                                }}
                            />
                        </View>
                    </View>
                    <Text className="mt-1 font-sans text-[12px] font-semibold text-accent-deep">
                        {liveRate > 0 ? `+$${formatMoney(liveRate, 4)} every second` : "Off the clock"}
                    </Text>
                </View>

                <ScrollView
                    className="mt-7 flex-1 px-[22px]"
                    contentContainerStyle={{ paddingBottom: 128 }}
                    showsVerticalScrollIndicator={false}
                >
                    {sources.map((source, index) => (
                        <SourceRow
                            key={source.id}
                            source={source}
                            index={index}
                            now={now}
                            onPress={() => {
                                setEditingId(source.id);
                                setSheetOpen(true);
                            }}
                        />
                    ))}
                    <Text className="py-4 text-center font-sans text-[11px] text-muted">Tap a source to edit it</Text>
                </ScrollView>
            </View>

            <View className="absolute right-0 bottom-0 left-0 rounded-t-[28px] bg-sheet px-6 pt-5 pb-8 shadow-2xl">
                <View className="absolute top-2 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-field" />
                <PrimaryButton label="＋  New payment source" onPress={openNewSource} testID="new-source" />
            </View>

            {sheetOpen ? (
                <PaymentSheet
                    isPresented
                    source={editingSource}
                    now={now}
                    onDismiss={closeSheet}
                    onDelete={(id) => {
                        setSources((current) => current.filter((source) => source.id !== id));
                        closeSheet();
                    }}
                    onSave={saveSource}
                />
            ) : null}
        </View>
    );
}
