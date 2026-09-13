import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { NumberFlow } from "number-flow-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PaymentSheet, PrimaryButton } from "@/features/earnings/payment-sheet";
import {
    PaymentDraft,
    PaymentSource,
    currentShift,
    earnedToday,
    formatMoney,
    formatTime,
    ratePerSecond,
} from "@/features/earnings/model";
import { useEarningsTheme } from "@/features/earnings/theme";
import { EarningsBackground } from "@/features/earnings/earnings-background";
import { useEarningsStore } from "@/features/earnings/store";

function useLiveClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 200);
        return () => clearInterval(timer);
    }, []);

    return now;
}

function shiftLabel(start: number, end: number) {
    const startLabel = formatTime(start);
    const endLabel = formatTime(end);
    const suffix = endLabel.endsWith("AM") ? " AM" : " PM";
    return startLabel.endsWith(suffix)
        ? `${startLabel.slice(0, -suffix.length)}–${endLabel}`
        : `${startLabel}–${endLabel}`;
}

function scheduleLabel(source: PaymentSource) {
    const weekdays = source.days.length === 5 && [1, 2, 3, 4, 5].every((day) => source.days.includes(day));
    const days = weekdays
        ? "Mon–Fri"
        : source.days
              .slice()
              .sort((a, b) => a - b)
              .map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day])
              .join(", ");
    return `${days} · ${source.shifts.map((shift) => shiftLabel(shift.start, shift.end)).join(", ")}`;
}

function SourceRow({ source, now, onPress }: { source: PaymentSource; now: Date; onPress: () => void }) {
    const shift = currentShift(source, now);
    const active = Boolean(shift);
    const subtitle = source.frequency === "once"
        ? source.when === "today" ? "Landed today" : "Scheduled"
        : scheduleLabel(source);
    const state = source.frequency === "once" ? (source.when === "today" ? "Paid" : "Scheduled") : shift
        ? `Until ${formatTime(shift.end)}`
        : "Idle";

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${source.name}`}
            onPress={onPress}
            className={`flex-row items-start gap-[18px] rounded-2xl px-5 py-[18px] active:opacity-75 ${active ? "bg-active" : "bg-row"}`}
        >
            <View className="min-w-0 flex-1 gap-1.5">
                <Text numberOfLines={1} className="font-sans text-[17px] font-semibold tracking-[-0.25px] text-ink">
                    {source.name}
                </Text>
                <Text numberOfLines={1} className="font-sans text-[12.5px] text-muted">
                    {subtitle}
                </Text>
            </View>
            <View className="items-end gap-1.5">
                <Text className={`font-sans text-[17px] font-semibold ${active || source.frequency === "once" ? "text-ink" : "text-muted"}`}>
                    ${formatMoney(earnedToday(source, now))}
                </Text>
                <Text className={`font-sans text-[12px] font-medium ${active ? "text-accent-deep" : "text-muted"}`}>
                    {state}
                </Text>
            </View>
        </Pressable>
    );
}

export default function EarningsScreen() {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useEarningsTheme();
    const now = useLiveClock();
    const sources = useEarningsStore((state) => state.sources);
    const ready = useEarningsStore((state) => state.ready);
    const saving = useEarningsStore((state) => state.saving);
    const loadError = useEarningsStore((state) => state.loadError);
    const load = useEarningsStore((state) => state.load);
    const save = useEarningsStore((state) => state.save);
    const remove = useEarningsStore((state) => state.remove);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => { void load(); }, [load]);

    const editingSource = sources.find((source) => source.id === editingId);
    const total = useMemo(() => sources.reduce((sum, source) => sum + earnedToday(source, now), 0), [now, sources]);
    const liveRate = useMemo(
        () => sources.reduce((sum, source) => sum + (currentShift(source, now) ? ratePerSecond(source) : 0), 0),
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
        if (useEarningsStore.getState().saving) return;
        setSheetOpen(false);
        setEditingId(null);
    };

    const saveSource = async (draft: PaymentDraft, id?: number) => {
        if (useEarningsStore.getState().saving) return;
        try {
            await save(draft, id);
            closeSheet();
        } catch {
            Alert.alert("Couldn't save", "Your changes haven't been saved. Please try again.");
        }
    };

    const removeSource = async (id: number) => {
        if (useEarningsStore.getState().saving) return;
        try {
            await remove(id);
            closeSheet();
        } catch {
            Alert.alert("Couldn't delete", "Your payment source is still saved. Please try again.");
        }
    };

    return (
        <View className="flex-1 items-center bg-canvas">
            <StatusBar style={isDark ? "light" : "dark"} />
            <View className="relative w-full max-w-[430px] flex-1 overflow-hidden bg-canvas">
                <EarningsBackground />

                <View className="flex-1" style={{ paddingTop: insets.top }}>
                    <View className="absolute right-[22px] z-10" style={{ top: insets.top + 8 }}>
                        <Pressable testID="open-settings" accessibilityRole="button" accessibilityLabel="Settings"
                            onPress={() => router.navigate("/settings")}
                            className="min-h-11 flex-row items-center gap-2 rounded-full bg-row px-4 active:opacity-70">
                            <Text style={{ color: colors.ink, fontSize: 20 }}>⚙</Text>
                            <Text className="font-sans text-[13px] font-semibold text-ink">Settings</Text>
                        </Pressable>
                    </View>
                    <View className="items-center pt-[84px]">
                        <View className="min-h-[92px] flex-row items-center justify-center">
                            <Text className="mr-1 font-sans text-[32px] font-medium text-muted">$</Text>
                            <NumberFlow
                                value={whole}
                                mask
                                locales="en-US"
                                format={{ maximumFractionDigits: 0 }}
                                trend={1}
                                style={{
                                    color: colors.ink,
                                    fontFamily: "Archivo-Bold",
                                    fontSize: 88,
                                    fontWeight: "700",
                                    letterSpacing: -4.4,
                                }}
                            />
                            <Text className="font-sans text-[36px] font-semibold tracking-[-1px] text-muted">.</Text>
                            <NumberFlow
                                value={cents}
                                mask
                                locales="en-US"
                                format={{ minimumIntegerDigits: 2, maximumFractionDigits: 0, useGrouping: false }}
                                trend={1}
                                style={{
                                    color: colors.muted,
                                    fontFamily: "Archivo-SemiBold",
                                    fontSize: 36,
                                    fontWeight: "600",
                                    letterSpacing: -1,
                                }}
                            />
                        </View>
                        <Text className="mt-4 font-sans text-[12.5px] font-semibold text-accent-deep">
                            {loadError ? "Sources unavailable" : !ready ? "Loading your sources…" : liveRate > 0 ? `+$${formatMoney(liveRate, 4)} every second` : "Off the clock"}
                        </Text>
                    </View>

                    <ScrollView
                        className="mt-16 flex-1 px-[22px]"
                        contentContainerStyle={{ gap: 10, paddingBottom: Math.max(40, insets.bottom + 20) }}
                        showsVerticalScrollIndicator={false}
                    >
                        {loadError ? (
                            <View className="gap-3 py-4">
                                <Text className="text-center font-sans text-[14px] text-muted">Could not load your saved sources.</Text>
                                <PrimaryButton label="Try again" onPress={() => void load()} />
                            </View>
                        ) : ready && sources.length === 0 ? (
                            <View testID="empty-sources" className="gap-2 py-4">
                                <Text className="text-center font-sans text-[17px] font-semibold text-ink">No payment sources yet</Text>
                                <Text className="text-center font-sans text-[14px] text-muted">Add your first source to start counting.</Text>
                            </View>
                        ) : null}
                        {sources.map((source) => (
                            <SourceRow
                                key={source.id}
                                source={source}
                                now={now}
                                onPress={() => {
                                    setEditingId(source.id);
                                    setSheetOpen(true);
                                }}
                            />
                        ))}
                        <View className="mt-1">
                            <PrimaryButton label="Add a payment source" disabled={!ready} onPress={openNewSource} testID="new-source" />
                        </View>
                    </ScrollView>
                </View>

                {sheetOpen ? (
                    <PaymentSheet
                        isPresented
                        source={editingSource}
                        now={now}
                        saving={saving}
                        onDismiss={closeSheet}
                        onDelete={removeSource}
                        onSave={saveSource}
                    />
                ) : null}
            </View>
        </View>
    );
}
