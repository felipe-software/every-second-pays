import { Fragment, useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { useKeyboardBottomSpacing } from "@/hooks/use-keyboard-bottom-spacing";
import { useEarningsTheme } from "./theme";

import {
    EMPTY_DRAFT,
    FREQUENCIES,
    HOUR_PRESETS,
    PaymentDraft,
    PaymentSource,
    Shift,
    currentShift,
    formatMoney,
    formatTime,
    hoursPerDay,
    labelDays,
    ratePerSecond,
    sameShifts,
    sourceToDraft,
} from "./model";

type Token = "name" | "amount" | "frequency" | "days" | "hours" | "when";

type PaymentSheetProps = {
    isPresented: boolean;
    source?: PaymentSource;
    now: Date;
    saving?: boolean;
    onDismiss: () => void;
    onDelete: (id: number) => void;
    onSave: (draft: PaymentDraft, id?: number) => void;
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SETS = [
    { label: "Weekdays", days: [1, 2, 3, 4, 5] },
    { label: "Weekends", days: [0, 6] },
    { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
];

const webModalRootStyle = Platform.OS === "web"
    ? ({ position: "fixed", top: 0, right: 0, bottom: 0, left: 0, zIndex: 100 } as unknown as ViewStyle)
    : undefined;

function cloneEmptyDraft(): PaymentDraft {
    return {
        ...EMPTY_DRAFT,
        days: [...EMPTY_DRAFT.days],
        shifts: EMPTY_DRAFT.shifts.map((shift) => ({ ...shift })),
    };
}

function sameDays(a: number[], b: number[]) {
    return [...a].sort().join() === [...b].sort().join();
}

function NativeField({
    value,
    onChangeText,
    placeholder,
    numeric = false,
    large = false,
}: {
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    numeric?: boolean;
    large?: boolean;
}) {
    const { colors } = useEarningsTheme();

    return (
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            keyboardType={numeric ? "decimal-pad" : "default"}
            autoCapitalize={numeric ? "none" : "words"}
            autoFocus
            selectionColor={colors.accent}
            style={{
                height: large ? 76 : 58,
                paddingHorizontal: large ? 4 : 18,
                paddingVertical: large ? 8 : 15,
                backgroundColor: large ? "transparent" : colors.field,
                borderRadius: 16,
                color: colors.ink,
                fontFamily: large ? "Archivo-Bold" : "Archivo-Medium",
                fontSize: large ? 44 : 19,
                fontWeight: large ? "700" : "500",
                lineHeight: large ? 52 : 26,
            }}
        />
    );
}

export function PrimaryButton({
    label,
    disabled,
    onPress,
    testID,
}: {
    label: string;
    disabled?: boolean;
    onPress: () => void;
    testID?: string;
}) {
    const { colors } = useEarningsTheme();

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: Boolean(disabled) }}
            disabled={disabled}
            onPress={onPress}
            testID={testID}
            className="h-[54px] w-full items-center justify-center rounded-[17px] active:scale-[0.985] active:opacity-90"
            style={{
                backgroundColor: disabled ? colors.soft : colors.accent,
                shadowColor: disabled ? "transparent" : colors.accent,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: disabled ? 0 : 0.28,
                shadowRadius: 18,
                elevation: disabled ? 0 : 5,
            }}
        >
            <Text
                className="font-sans text-[15.5px] font-semibold"
                style={{ color: disabled ? colors.muted : colors.ink }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

function TokenButton({ active, children, onPress }: { active: boolean; children: string; onPress: () => void }) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={onPress}
            className={`mr-[-3px] rounded-[7px] px-2 pb-px active:opacity-70 ${active ? "bg-token-active" : "bg-field"}`}
        >
            <Text className="font-sans text-[24px] leading-[27px] font-semibold text-ink">{children}</Text>
        </Pressable>
    );
}

function ChoiceChip({ selected, label, onPress, wide = false }: { selected: boolean; label: string; onPress: () => void; wide?: boolean }) {
    const { colors } = useEarningsTheme();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={onPress}
            className={`${wide ? "h-[50px] min-w-[30%] flex-1" : "px-[15px] py-2.5"} items-center justify-center rounded-[13px] active:opacity-75`}
            style={{ backgroundColor: selected ? colors.accent : colors.soft }}
        >
            <Text className="font-sans text-[13.5px] font-semibold" style={{ color: selected ? colors.ink : colors.muted }}>
                {label}
            </Text>
        </Pressable>
    );
}

function ScheduleTrack({ shifts, selected }: { shifts: Shift[]; selected: boolean }) {
    const { colors } = useEarningsTheme();
    return (
        <View className="relative h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: selected ? `${colors.ink}33` : colors.track }}>
            <View className="absolute top-0 bottom-0 left-1/2 w-px" style={{ backgroundColor: selected ? `${colors.ink}59` : colors.muted }} />
            {shifts.map((shift, index) => (
                <View
                    key={`${shift.start}-${shift.end}-${index}`}
                    className="absolute top-0 bottom-0 rounded-full"
                    style={{
                        left: `${(shift.start / 1440) * 100}%`,
                        width: `${(Math.max(0, shift.end - shift.start) / 1440) * 100}%`,
                        backgroundColor: selected ? colors.ink : colors.accent,
                    }}
                />
            ))}
        </View>
    );
}

function HoursChoice({ label, detail, shifts, selected, onPress }: { label: string; detail: string; shifts: Shift[]; selected: boolean; onPress: () => void }) {
    const { colors } = useEarningsTheme();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={onPress}
            className="gap-[11px] rounded-[15px] px-4 py-[15px] active:opacity-75"
            style={{ backgroundColor: selected ? colors.accent : colors.choice }}
        >
            <View className="flex-row items-baseline gap-3">
                <Text className="min-w-0 flex-1 font-sans text-[14.5px] font-semibold text-ink">{label}</Text>
                <Text className="font-sans text-[11.5px] font-medium" style={{ color: selected ? colors.ink : colors.muted }}>
                    {detail}
                </Text>
            </View>
            <ScheduleTrack shifts={shifts} selected={selected} />
        </Pressable>
    );
}

function TimeAdjuster({ label, value, decrease, increase }: { label: string; value: number; decrease: () => void; increase: () => void }) {
    return (
        <View className="min-w-0 flex-1 gap-1.5">
            <Text className="font-sans text-[10px] font-semibold tracking-[1.2px] text-muted uppercase">{label}</Text>
            <View className="h-11 flex-row items-center rounded-[13px] bg-field">
                <Pressable accessibilityLabel={`Earlier ${label}`} onPress={decrease} className="h-11 w-10 items-center justify-center active:opacity-60">
                    <Text className="font-sans text-[18px] text-muted">−</Text>
                </Pressable>
                <Text className="min-w-0 flex-1 text-center font-sans text-[13px] font-semibold text-ink">{formatTime(value)}</Text>
                <Pressable accessibilityLabel={`Later ${label}`} onPress={increase} className="h-11 w-10 items-center justify-center active:opacity-60">
                    <Text className="font-sans text-[18px] text-muted">+</Text>
                </Pressable>
            </View>
        </View>
    );
}

export function PaymentSheet({ isPresented, source, now, saving = false, onDismiss, onDelete, onSave }: PaymentSheetProps) {
    const { colors } = useEarningsTheme();
    const { bottomSpacingStyle, sheetStyle } = useKeyboardBottomSpacing();
    const [draft, setDraft] = useState<PaymentDraft>(() => source ? sourceToDraft(source) : cloneEmptyDraft());
    const [token, setToken] = useState<Token>("name");
    const [customHours, setCustomHours] = useState(() => source ? !HOUR_PRESETS.some((preset) => sameShifts(source.shifts, preset.shifts)) : false);

    const amount = Number(draft.amount) || 0;
    const calculationSource = useMemo<PaymentSource>(
        () => ({ ...draft, id: source?.id ?? -1, amount }),
        [amount, draft, source?.id],
    );
    const rate = ratePerSecond(calculationSource);
    const shift = currentShift(calculationSource, now);
    const recurring = draft.frequency !== "once";
    const valid = draft.name.trim().length > 0 && amount > 0 && (!recurring || (draft.days.length > 0 && hoursPerDay(draft) > 0));

    const patchDraft = (patch: Partial<PaymentDraft>) => setDraft((current) => ({ ...current, ...patch }));
    const patchShift = (index: number, patch: Partial<Shift>) => {
        setCustomHours(true);
        patchDraft({ shifts: draft.shifts.map((shiftItem, shiftIndex) => shiftIndex === index ? { ...shiftItem, ...patch } : shiftItem) });
    };

    const renderEditor = () => {
        if (token === "name") {
            return <NativeField value={draft.name} onChangeText={(name) => patchDraft({ name })} placeholder="Company or client" />;
        }

        if (token === "amount") {
            return (
                <View className="flex-row items-center gap-2">
                    <Text className="font-sans text-[32px] font-bold text-muted">$</Text>
                    <View className="flex-1">
                        <NativeField value={draft.amount} onChangeText={(next) => patchDraft({ amount: next.replace(/[^0-9.]/g, "") })} placeholder="0" numeric large />
                    </View>
                </View>
            );
        }

        if (token === "frequency") {
            return (
                <View className="gap-2.5">
                    <Text className="font-sans text-[10.5px] font-semibold tracking-[1.25px] text-muted uppercase">Paid per</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {FREQUENCIES.map((frequency) => (
                            <ChoiceChip
                                key={frequency.value}
                                label={{ hour: "Hour", week: "Week", month: "Month", year: "Year", second: "Second", once: "One-time" }[frequency.value]}
                                wide
                                selected={draft.frequency === frequency.value}
                                onPress={() => {
                                    patchDraft({ frequency: frequency.value });
                                    if (frequency.value === "once") setToken("when");
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
                            label={when === "today" ? "Today" : "On a future date"}
                            selected={draft.when === when}
                            onPress={() => patchDraft({ when })}
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
                                    accessibilityLabel={DAY_NAMES[day]}
                                    accessibilityState={{ selected }}
                                    onPress={() => patchDraft({ days: selected ? draft.days.filter((value) => value !== day) : [...draft.days, day].sort() })}
                                    className="flex-1 items-center justify-center active:opacity-75"
                                    style={{ backgroundColor: selected ? colors.accent : "transparent" }}
                                >
                                    <Text className="font-sans text-[14px] font-semibold" style={{ color: selected ? colors.ink : colors.muted }}>
                                        {DAY_LABELS[day]}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                    <View className="flex-row items-baseline gap-4 px-0.5">
                        {DAY_SETS.map((option) => {
                            const selected = sameDays(option.days, draft.days);
                            return (
                                <Pressable key={option.label} onPress={() => patchDraft({ days: [...option.days] })} className="active:opacity-60">
                                    <Text className="font-sans text-[12.5px] font-semibold underline" style={{ color: selected ? colors.accentDeep : colors.muted }}>
                                        {option.label}
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
                    const selected = !customHours && matchingPreset?.label === preset.label;
                    const hours = hoursPerDay({ shifts: preset.shifts });
                    return (
                        <HoursChoice
                            key={preset.label}
                            label={preset.label}
                            detail={`${Number.isInteger(hours) ? hours : hours.toFixed(1)}h per day`}
                            shifts={preset.shifts}
                            selected={selected}
                            onPress={() => {
                                setCustomHours(false);
                                patchDraft({ shifts: preset.shifts.map((item) => ({ ...item })) });
                            }}
                        />
                    );
                })}
                <HoursChoice
                    label="Custom hours"
                    detail={`${hoursPerDay(draft).toFixed(1).replace(".0", "")}h per day`}
                    shifts={draft.shifts}
                    selected={customHours || !matchingPreset}
                    onPress={() => setCustomHours(true)}
                />
                {customHours || !matchingPreset ? (
                    <View className="gap-3 pt-1">
                        {draft.shifts.map((shiftItem, index) => (
                            <View key={`${index}-${shiftItem.start}-${shiftItem.end}`} className="flex-row items-end gap-2">
                                <TimeAdjuster
                                    label="Start"
                                    value={shiftItem.start}
                                    decrease={() => patchShift(index, { start: Math.max(0, shiftItem.start - 15) })}
                                    increase={() => patchShift(index, { start: Math.min(shiftItem.end - 15, shiftItem.start + 15) })}
                                />
                                <TimeAdjuster
                                    label="End"
                                    value={shiftItem.end}
                                    decrease={() => patchShift(index, { end: Math.max(shiftItem.start + 15, shiftItem.end - 15) })}
                                    increase={() => patchShift(index, { end: Math.min(1440, shiftItem.end + 15) })}
                                />
                                <Pressable
                                    accessibilityLabel="Remove time block"
                                    disabled={draft.shifts.length === 1}
                                    onPress={() => patchDraft({ shifts: draft.shifts.filter((_, shiftIndex) => shiftIndex !== index) })}
                                    className="mb-1.5 h-8 w-8 items-center justify-center rounded-full bg-soft active:opacity-60"
                                    style={{ opacity: draft.shifts.length === 1 ? 0.35 : 1 }}
                                >
                                    <Text className="font-sans text-[16px] text-muted">×</Text>
                                </Pressable>
                            </View>
                        ))}
                        <Pressable
                            onPress={() => patchDraft({ shifts: [...draft.shifts, { start: 780, end: 1020 }] })}
                            className="self-start px-0.5 py-1 active:opacity-60"
                        >
                            <Text className="font-sans text-[12.5px] font-semibold text-accent-deep">Add another block</Text>
                        </Pressable>
                    </View>
                ) : null}
            </View>
        );
    };

    const frequencyLabel = FREQUENCIES.find((item) => item.value === draft.frequency)?.label ?? "per month";
    const nowLine = recurring
        ? shift ? `Working right now · until ${formatTime(shift.end)}` : draft.days.length && hoursPerDay(draft) > 0 ? "Not working right now" : "Pick days and hours"
        : draft.when === "later" ? "Held until its date" : "Lands in today’s total";

    return (
        <Modal
            visible={isPresented}
            transparent
            animationType={Platform.OS === "web" ? "fade" : "slide"}
            presentationStyle="overFullScreen"
            statusBarTranslucent
            onRequestClose={onDismiss}
        >
            <View className="flex-1 justify-end" style={webModalRootStyle}>
                <Pressable accessibilityLabel="Close sheet" onPress={onDismiss} className="absolute inset-0 bg-black/30 dark:bg-black/50" />
                <Animated.View
                    testID="payment-sheet"
                    className="w-full max-w-[430px] self-center overflow-hidden rounded-t-[28px] bg-sheet"
                    style={[
                        sheetStyle,
                        { shadowColor: "#3C2814", shadowOffset: { width: 0, height: -14 }, shadowOpacity: 0.18, shadowRadius: 30, elevation: 18 },
                    ]}
                >
                    <View className="flex-row items-center gap-3 border-b px-[22px] pt-[22px] pb-4" style={{ borderColor: `${colors.ink}1F` }}>
                        <Text className="min-w-0 flex-1 font-sans text-[25px] font-bold tracking-[-0.75px] text-ink">
                            {source ? "Edit source" : "New payment source"}
                        </Text>
                        {source ? (
                            <Pressable disabled={saving} onPress={() => onDelete(source.id)} className="h-9 justify-center rounded-[11px] bg-danger/10 px-3.5 active:opacity-65">
                                <Text className="font-sans text-[13px] font-semibold text-danger">Delete</Text>
                            </Pressable>
                        ) : null}
                        <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onDismiss} className="h-9 w-9 items-center justify-center rounded-[11px] bg-soft active:opacity-65">
                            <Text className="mt-[-2px] font-sans text-[21px] text-muted">×</Text>
                        </Pressable>
                    </View>

                    <View className="flex-row flex-wrap items-center px-6 pt-[18px] pb-5">
                        <TokenButton active={token === "name"} onPress={() => setToken("name")}>{draft.name.trim() || "someone"}</TokenButton>
                        <Text className="font-sans text-[24px] leading-8 font-medium text-muted"> {recurring ? "pays me" : "paid me"} </Text>
                        <TokenButton active={token === "amount"} onPress={() => setToken("amount")}>{amount ? `$${formatMoney(amount, 0)}` : "$0"}</TokenButton>
                        <Text className="font-sans text-[24px] leading-8 font-medium text-muted"> </Text>
                        <TokenButton active={token === "frequency"} onPress={() => setToken("frequency")}>{frequencyLabel}</TokenButton>
                        {recurring ? (
                            <>
                                <Text className="font-sans text-[24px] leading-8 font-medium text-muted">, on </Text>
                                <TokenButton active={token === "days"} onPress={() => setToken("days")}>{labelDays(draft.days)}</TokenButton>
                                {draft.shifts.map((shiftItem, index) => (
                                    <Fragment key={`${shiftItem.start}-${shiftItem.end}-${index}`}>
                                        <Text className="font-sans text-[24px] leading-8 font-medium text-muted">{index === 0 ? ", from " : " and from "}</Text>
                                        <TokenButton active={token === "hours"} onPress={() => setToken("hours")}>{formatTime(shiftItem.start)}</TokenButton>
                                        <Text className="font-sans text-[24px] leading-8 font-medium text-muted"> to </Text>
                                        <TokenButton active={token === "hours"} onPress={() => setToken("hours")}>{formatTime(shiftItem.end)}</TokenButton>
                                    </Fragment>
                                ))}
                                <Text className="font-sans text-[24px] leading-8 font-medium text-muted">.</Text>
                            </>
                        ) : (
                            <>
                                <Text className="font-sans text-[24px] leading-8 font-medium text-muted">, landing </Text>
                                <TokenButton active={token === "when"} onPress={() => setToken("when")}>{draft.when === "later" ? "on a future date" : "today"}</TokenButton>
                                <Text className="font-sans text-[24px] leading-8 font-medium text-muted">.</Text>
                            </>
                        )}
                    </View>

                    <ScrollView
                        className="flex-1 bg-raised"
                        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {renderEditor()}
                    </ScrollView>

                    <View className="gap-3 px-6 pt-3.5 pb-0">
                        <View className="flex-row items-center gap-[9px]">
                            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: shift ? colors.accent : colors.field, shadowColor: colors.accent, shadowOpacity: shift ? 0.45 : 0, shadowRadius: 5 }} />
                            <Text className="min-w-0 flex-1 font-sans text-[12.5px] font-medium text-ink">{nowLine}</Text>
                            <Text className="font-sans text-[12.5px] font-semibold text-muted">
                                {recurring && rate > 0 ? `$${formatMoney(rate, 4)}/sec` : !recurring && amount > 0 ? `$${formatMoney(amount)}` : ""}
                            </Text>
                        </View>
                        <PrimaryButton
                            label={saving ? "Saving…" : source ? "Save changes" : recurring ? "Start counting" : "Add payment"}
                            disabled={!valid || saving}
                            onPress={() => valid && onSave(draft, source?.id)}
                            testID="save-source"
                        />
                    </View>
                    <Animated.View style={bottomSpacingStyle} />
                </Animated.View>
            </View>
        </Modal>
    );
}
