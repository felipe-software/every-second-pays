import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useCalendars } from "expo-localization";
import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";
import { appHaptics } from "@/features/haptics/haptics";

import type { Shift } from "./model";
import { useEarningsTheme } from "./theme";

export function NativeField({
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
            selectionColor={colors.accent}
            style={{
                height: large ? 76 : 58,
                paddingHorizontal: large ? 4 : 18,
                paddingVertical: large ? 8 : 15,
                backgroundColor: large
                    ? "transparent"
                    : Platform.OS === "ios"
                        ? colors.fieldGlass
                        : colors.field,
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
            onPress={() => {
                appHaptics.primaryAction();
                onPress();
            }}
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

export function TokenButton({ active, children, onPress }: { active: boolean; children: string; onPress: () => void }) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
                appHaptics.selection();
                onPress();
            }}
            className={`mr-[-3px] rounded-[7px] px-2 pb-px active:opacity-70 ${active ? "bg-token-active" : "bg-field"}`}
        >
            <Text className="font-sans text-[24px] leading-[27px] font-semibold text-ink">{children}</Text>
        </Pressable>
    );
}

export function ChoiceChip({ selected, label, onPress, wide = false }: { selected: boolean; label: string; onPress: () => void; wide?: boolean }) {
    const { colors } = useEarningsTheme();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
                appHaptics.selection();
                onPress();
            }}
            className={`${wide ? "h-[50px] min-w-[30%] flex-1" : "px-[15px] py-2.5"} items-center justify-center rounded-[13px] active:opacity-75`}
            style={{ backgroundColor: selected ? colors.accent : colors.soft }}
        >
            <Text className="font-sans text-[13.5px] font-semibold" style={{ color: selected ? colors.ink : colors.muted }}>
                {label}
            </Text>
        </Pressable>
    );
}

function ScheduleTrack({ shifts, selected }: { shifts: readonly Shift[]; selected: boolean }) {
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

export function HoursChoice({ label, detail, shifts, selected, onPress }: { label: string; detail: string; shifts: readonly Shift[]; selected: boolean; onPress: () => void }) {
    const { colors } = useEarningsTheme();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
                appHaptics.selection();
                onPress();
            }}
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

function dateFromMinutes(totalMinutes: number) {
    const minutes = ((totalMinutes % 1440) + 1440) % 1440;
    return new Date(2024, 0, 1, Math.floor(minutes / 60), minutes % 60);
}

export function SystemTimeInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
    const [androidPickerOpen, setAndroidPickerOpen] = useState(false);
    const { locale, formatTime } = useI18n();
    const { colors, isDark } = useEarningsTheme();
    const uses24HourClock = useCalendars()[0]?.uses24hourClock;
    const picker = (
        <DateTimePicker
            value={dateFromMinutes(value)}
            mode="time"
            display="compact"
            presentation="dialog"
            locale={locale.replace("-", "_")}
            is24Hour={uses24HourClock ?? undefined}
            accentColor={colors.accentDeep}
            themeVariant={isDark ? "dark" : "light"}
            onDismiss={() => setAndroidPickerOpen(false)}
            onValueChange={(_, date) => {
                setAndroidPickerOpen(false);
                appHaptics.selection();
                onChange(date.getHours() * 60 + date.getMinutes());
            }}
            style={Platform.OS === "ios" ? { width: "100%", height: 44 } : undefined}
        />
    );

    return (
        <View className="min-w-0 flex-1 gap-1.5">
            <Text className="font-sans text-[10px] font-semibold tracking-[1.2px] text-muted uppercase">{label}</Text>
            {Platform.OS === "ios" ? (
                <View className="h-11 overflow-hidden rounded-[13px] bg-field">
                    {picker}
                </View>
            ) : (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${label}: ${formatTime(value)}`}
                    accessibilityState={{ expanded: androidPickerOpen }}
                    onPress={() => {
                        appHaptics.selection();
                        setAndroidPickerOpen(true);
                    }}
                    className="h-11 items-center justify-center rounded-[13px] bg-field active:opacity-60"
                >
                    <Text className="font-sans text-[13px] font-semibold text-ink">{formatTime(value)}</Text>
                </Pressable>
            )}
            {Platform.OS === "android" && androidPickerOpen ? picker : null}
        </View>
    );
}
