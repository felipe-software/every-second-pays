import { Button as NativeButton, Host, Text as NativeText, TextInput as NativeTextInput } from "@expo/ui";
import { useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import Animated from "react-native-reanimated";

import { useKeyboardBottomSpacing } from "@/hooks/use-keyboard-bottom-spacing";
import { useEarningsTheme } from "./theme";

import {
    DAY_LETTERS,
    EMPTY_DRAFT,
    FREQUENCIES,
    HOUR_PRESETS,
    PaymentDraft,
    PaymentSource,
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
    onDismiss: () => void;
    onDelete: (id: number) => void;
    onSave: (draft: PaymentDraft, id?: number) => void;
};

function cloneEmptyDraft(): PaymentDraft {
    return {
        ...EMPTY_DRAFT,
        days: [...EMPTY_DRAFT.days],
        shifts: EMPTY_DRAFT.shifts.map((shift) => ({ ...shift })),
    };
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
    const { width } = useWindowDimensions();
    const { colors } = useEarningsTheme();
    const fieldWidth = Math.max(0, width - (large ? 92 : 48));

    return (
        <Host style={{ width: "100%", height: large ? 76 : 58 }}>
            <NativeTextInput
                defaultValue={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.muted}
                keyboardType={numeric ? "decimal-pad" : "default"}
                autoCapitalize={numeric ? "none" : "words"}
                autoFocus
                style={{
                    width: fieldWidth,
                    height: large ? 76 : 58,
                    paddingHorizontal: large ? 4 : 18,
                    paddingVertical: large ? 12 : 17,
                    backgroundColor: large ? "transparent" : colors.field,
                    borderRadius: 16,
                }}
                textStyle={{
                    color: colors.ink,
                    fontFamily: "Archivo",
                    fontSize: large ? 44 : 18,
                    fontWeight: large ? "700" : "500",
                    lineHeight: large ? 52 : 24,
                }}
            />
        </Host>
    );
}

function PrimaryButton({
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
    const { width } = useWindowDimensions();
    const { colors } = useEarningsTheme();

    return (
        <Host seedColor="#E8763A" style={{ width: "100%", height: 54 }}>
            <NativeButton
                disabled={disabled}
                onPress={onPress}
                testID={testID}
                variant="text"
                style={{
                    width: Math.max(0, width - 48),
                    height: 54,
                    borderRadius: 17,
                    backgroundColor: disabled ? colors.field : colors.accent,
                }}
            >
                <NativeText
                    textStyle={{
                        color: disabled ? colors.muted : "#FFFFFF",
                        fontFamily: "Archivo-SemiBold",
                        fontSize: 15,
                        fontWeight: "600",
                    }}
                >
                    {label}
                </NativeText>
            </NativeButton>
        </Host>
    );
}

function TokenButton({
    active,
    children,
    onPress,
}: {
    active: boolean;
    children: string;
    onPress: () => void;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            className={`mx-0.5 rounded-lg px-2 py-0.5 active:opacity-70 ${
                active ? "bg-soft" : "bg-field"
            }`}
        >
            <Text className="font-sans text-[22px] leading-[31px] font-semibold text-ink">
                {children}
            </Text>
        </Pressable>
    );
}

function ChoiceChip({
    selected,
    label,
    onPress,
}: {
    selected: boolean;
    label: string;
    onPress: () => void;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={onPress}
            className={`rounded-[13px] px-4 py-2.5 active:opacity-70 ${
                selected ? "bg-accent" : "bg-field"
            }`}
        >
            <Text
                className={`font-sans text-[13px] font-semibold ${
                    selected ? "text-white" : "text-muted"
                }`}
            >
                {label}
            </Text>
        </Pressable>
    );
}

export function PaymentSheet({
    isPresented,
    source,
    now,
    onDismiss,
    onDelete,
    onSave,
}: PaymentSheetProps) {
    const { bottomSpacingStyle, sheetStyle } = useKeyboardBottomSpacing();
    const [draft, setDraft] = useState<PaymentDraft>(() =>
        source ? sourceToDraft(source) : cloneEmptyDraft(),
    );
    const [token, setToken] = useState<Token>("name");

    const amount = Number(draft.amount) || 0;
    const calculationSource = useMemo<PaymentSource>(
        () => ({ ...draft, id: source?.id ?? -1, amount }),
        [amount, draft, source?.id],
    );
    const rate = ratePerSecond(calculationSource);
    const shift = currentShift(calculationSource, now);
    const recurring = draft.frequency !== "once";
    const valid =
        draft.name.trim().length > 0 &&
        amount > 0 &&
        (!recurring || (draft.days.length > 0 && hoursPerDay(draft) > 0));

    const patchDraft = (patch: Partial<PaymentDraft>) =>
        setDraft((current) => ({ ...current, ...patch }));

    const renderEditor = () => {
        if (token === "name") {
            return (
                <NativeField
                    value={draft.name}
                    onChangeText={(name) => patchDraft({ name })}
                    placeholder="Company or client"
                />
            );
        }

        if (token === "amount") {
            return (
                <View className="flex-row items-center">
                    <Text className="font-sans text-[32px] font-bold text-muted">$</Text>
                    <View className="ml-2 flex-1">
                        <NativeField
                            value={draft.amount}
                            onChangeText={(next) => patchDraft({ amount: next.replace(/[^0-9.]/g, "") })}
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
                <View className="flex-row flex-wrap gap-2">
                    {FREQUENCIES.map((frequency) => (
                        <ChoiceChip
                            key={frequency.value}
                            label={frequency.label}
                            selected={draft.frequency === frequency.value}
                            onPress={() => {
                                patchDraft({ frequency: frequency.value });
                                if (frequency.value === "once") setToken("when");
                            }}
                        />
                    ))}
                </View>
            );
        }

        if (token === "when") {
            return (
                <View className="flex-row flex-wrap gap-2">
                    {(["today", "later"] as const).map((when) => (
                        <ChoiceChip
                            key={when}
                            label={when === "today" ? "today" : "on a future date"}
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
                    <View className="flex-row gap-1.5">
                        {DAY_LETTERS.map((label, day) => {
                            const selected = draft.days.includes(day);
                            return (
                                <Pressable
                                    key={`${label}-${day}`}
                                    accessibilityLabel={[
                                        "Sunday",
                                        "Monday",
                                        "Tuesday",
                                        "Wednesday",
                                        "Thursday",
                                        "Friday",
                                        "Saturday",
                                    ][day]}
                                    accessibilityState={{ selected }}
                                    onPress={() =>
                                        patchDraft({
                                            days: selected
                                                ? draft.days.filter((value) => value !== day)
                                                : [...draft.days, day].sort(),
                                        })
                                    }
                                    className={`h-11 flex-1 items-center justify-center rounded-[13px] ${
                                        selected ? "bg-accent" : "bg-field"
                                    }`}
                                >
                                    <Text
                                        className={`font-sans text-[13px] font-semibold ${
                                            selected ? "text-white" : "text-muted"
                                        }`}
                                    >
                                        {label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                        {[
                            { label: "Weekdays", days: [1, 2, 3, 4, 5] },
                            { label: "Weekends", days: [0, 6] },
                            { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
                        ].map((option) => (
                            <ChoiceChip
                                key={option.label}
                                label={option.label}
                                selected={option.days.join() === draft.days.join()}
                                onPress={() => patchDraft({ days: [...option.days] })}
                            />
                        ))}
                    </View>
                </View>
            );
        }

        return (
            <View className="gap-2.5">
                {HOUR_PRESETS.map((preset) => {
                    const selected = sameShifts(draft.shifts, preset.shifts);
                    const hours = hoursPerDay({ shifts: preset.shifts });
                    return (
                        <Pressable
                            key={preset.label}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() =>
                                patchDraft({
                                    shifts: preset.shifts.map((item) => ({ ...item })),
                                })
                            }
                            className={`flex-row items-center rounded-[15px] px-4 py-3.5 active:opacity-70 ${
                                selected ? "bg-soft" : "bg-sheet"
                            }`}
                        >
                            <Text className="flex-1 font-sans text-[14px] font-semibold text-ink">
                                {preset.label}
                            </Text>
                            <Text className="font-sans text-[11px] text-muted">{hours}h per day</Text>
                            <Text
                                className={`ml-3 font-sans text-[15px] font-bold ${
                                    selected ? "text-accent-deep" : "text-transparent"
                                }`}
                            >
                                ✓
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        );
    };

    const frequencyLabel =
        FREQUENCIES.find((item) => item.value === draft.frequency)?.label ?? "per month";

    return (
        <Modal
            visible={isPresented}
            transparent
            animationType="slide"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            onRequestClose={onDismiss}
        >
            <View className="flex-1 justify-end">
                <Pressable
                    accessibilityLabel="Close sheet"
                    onPress={onDismiss}
                    className="absolute inset-0 bg-black/25 dark:bg-black/50"
                />
                <Animated.View
                    testID="payment-sheet"
                    className="overflow-hidden rounded-t-[28px] bg-sheet pt-1"
                    style={sheetStyle}
                >
                    <View className="items-center py-2">
                        <View className="h-1 w-9 rounded-full bg-[#c7b8af]" />
                    </View>
                    <View className="flex-row items-center gap-3 px-6 pt-1">
                    <Text className="flex-1 font-sans text-[13px] font-semibold text-muted">
                        {source ? "Edit source" : "New payment source"}
                    </Text>
                    {source ? (
                        <Pressable onPress={() => onDelete(source.id)} hitSlop={10}>
                            <Text className="font-sans text-[12px] font-semibold text-danger">Delete</Text>
                        </Pressable>
                    ) : null}
                    <Pressable
                        accessibilityLabel="Close"
                        accessibilityRole="button"
                        onPress={onDismiss}
                        className="h-8 w-8 items-center justify-center rounded-full bg-field"
                    >
                        <Text className="font-sans text-[18px] text-muted">×</Text>
                    </Pressable>
                    </View>

                    <View className="flex-row flex-wrap items-center px-6 py-4">
                    <TokenButton active={token === "name"} onPress={() => setToken("name")}>
                        {draft.name.trim() || "someone"}
                    </TokenButton>
                    <Text className="font-sans text-[22px] leading-[34px] text-muted">
                        {recurring ? "pays me" : "paid me"}
                    </Text>
                    <TokenButton active={token === "amount"} onPress={() => setToken("amount")}>
                        {amount ? `$${formatMoney(amount, 0)}` : "$0"}
                    </TokenButton>
                    <TokenButton active={token === "frequency"} onPress={() => setToken("frequency")}>
                        {frequencyLabel}
                    </TokenButton>
                    {recurring ? (
                        <>
                            <Text className="font-sans text-[22px] leading-[34px] text-muted">, on</Text>
                            <TokenButton active={token === "days"} onPress={() => setToken("days")}>
                                {labelDays(draft.days)}
                            </TokenButton>
                            <Text className="font-sans text-[22px] leading-[34px] text-muted">, from</Text>
                            <TokenButton active={token === "hours"} onPress={() => setToken("hours")}>
                                {draft.shifts.length
                                    ? `${formatTime(draft.shifts[0].start)} to ${formatTime(
                                          draft.shifts.at(-1)!.end,
                                      )}`
                                    : "pick hours"}
                            </TokenButton>
                            <Text className="font-sans text-[22px] leading-[34px] text-muted">.</Text>
                        </>
                    ) : (
                        <>
                            <Text className="font-sans text-[22px] leading-[34px] text-muted">, landing</Text>
                            <TokenButton active={token === "when"} onPress={() => setToken("when")}>
                                {draft.when === "later" ? "on a future date" : "today"}
                            </TokenButton>
                            <Text className="font-sans text-[22px] leading-[34px] text-muted">.</Text>
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

                    <View className="gap-3 px-6 pt-3 pb-1">
                        <View className="flex-row items-center gap-2.5">
                        <View className={`h-2 w-2 rounded-full ${shift ? "bg-accent" : "bg-field"}`} />
                        <Text className="flex-1 font-sans text-[12px] font-medium text-ink">
                            {recurring
                                ? shift
                                    ? `Working right now · until ${formatTime(shift.end)}`
                                    : "Not working right now"
                                : draft.when === "later"
                                  ? "Held until its date"
                                  : "Lands in today’s total"}
                        </Text>
                        <Text className="font-sans text-[12px] font-semibold text-muted">
                            {recurring && rate > 0
                                ? `$${formatMoney(rate, 4)}/sec`
                                : !recurring && amount > 0
                                  ? `$${formatMoney(amount)}`
                                  : ""}
                        </Text>
                        </View>
                        <PrimaryButton
                            label={source ? "Save changes" : recurring ? "Start counting" : "Add payment"}
                            disabled={!valid}
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

export { PrimaryButton };
