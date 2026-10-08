import { Host, TimePickerDialog } from "@expo/ui/jetpack-compose";
import { useCalendars } from "expo-localization";
import { useState } from "react";
import { Text, View } from "react-native";

import { RaisedPressable } from "@/components/elevated/raised";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { dateFromMinutes } from "./model";
import type { SystemTimeInputProps } from "./system-time-input";
import { INLINE_TIME_PADDING } from "./hours/arc-geometry";
import { useEarningsTheme } from "./theme";

export function SystemTimeInput({ label, value, onChange, variant = "field", fontSize = 20 }: SystemTimeInputProps) {
    const [open, setOpen] = useState(false);
    const { t, formatTime } = useI18n();
    const { colors, isDark } = useEarningsTheme();
    const uses24HourClock = useCalendars()[0]?.uses24hourClock;

    const inline = variant === "inline";

    return (
        <View className={inline ? undefined : "min-w-0 flex-1 gap-1.5"}>
            {inline ? null : (
                <Text className="font-sans text-[10px] font-semibold tracking-[1.2px] text-muted uppercase">{label}</Text>
            )}
            <RaisedPressable
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${formatTime(value)}`}
                accessibilityState={{ expanded: open }}
                onPress={() => {
                    appHaptics.selection();
                    setOpen(true);
                }}
                hitSlop={inline ? 8 : undefined}
                containerClassName={inline ? "min-w-0 shrink" : undefined}
                surface={inline ? "chip" : "fill"}
                depth={2}
                radius={inline ? 7 : 13}
                className={inline ? "items-center justify-center py-0.5" : "h-11 items-center justify-center"}
                style={inline ? { paddingHorizontal: INLINE_TIME_PADDING } : undefined}
            >
                <Text
                    numberOfLines={1}
                    className={inline ? "font-sans font-bold text-ink tabular-nums" : "font-sans text-[13px] font-semibold text-ink tabular-nums"}
                    style={inline ? { fontSize, letterSpacing: -fontSize * 0.02 } : undefined}
                >
                    {formatTime(value)}
                </Text>
            </RaisedPressable>
            {open ? (
                // The Compose dialog otherwise follows the device appearance and Material You colors.
                <Host colorScheme={isDark ? "dark" : "light"} seedColor={colors.accent}>
                    <TimePickerDialog
                        initialDate={dateFromMinutes(value).toISOString()}
                        is24Hour={uses24HourClock ?? undefined}
                        confirmButtonLabel={t("common.ok")}
                        dismissButtonLabel={t("common.cancel")}
                        color={colors.accentDeep}
                        elementColors={{
                            containerColor: colors.canvas,
                            clockDialColor: colors.active,
                            clockDialSelectedContentColor: colors.ink,
                            clockDialUnselectedContentColor: colors.ink,
                            selectorColor: colors.accent,
                            periodSelectorBorderColor: colors.track,
                            periodSelectorSelectedContainerColor: colors.accent,
                            periodSelectorUnselectedContainerColor: "transparent",
                            periodSelectorSelectedContentColor: colors.ink,
                            periodSelectorUnselectedContentColor: colors.muted,
                            timeSelectorSelectedContainerColor: colors.accent,
                            timeSelectorUnselectedContainerColor: colors.active,
                            timeSelectorSelectedContentColor: colors.ink,
                            timeSelectorUnselectedContentColor: colors.ink,
                        }}
                        onDateSelected={(date) => {
                            setOpen(false);
                            appHaptics.selection();
                            onChange(date.getHours() * 60 + date.getMinutes());
                        }}
                        onDismissRequest={() => setOpen(false)}
                    />
                </Host>
            ) : null}
        </View>
    );
}
