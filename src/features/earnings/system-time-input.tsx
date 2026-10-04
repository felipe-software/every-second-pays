import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useCalendars } from "expo-localization";
import { Text, View } from "react-native";

import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { dateFromMinutes } from "./model";
import { useEarningsTheme, useSheetFill } from "./theme";

export type SystemTimeInputProps = {
    label: string;
    value: number;
    onChange: (value: number) => void;
    /** `field` is a labeled input; `inline` is just the time, for use inside the hours dial. */
    variant?: "field" | "inline";
    /** Overrides the displayed time where the platform renders its own (e.g. "12" in "12 – 5 PM"). */
    text?: string;
    /** Font size of an `inline` time drawn by the app (Android). */
    fontSize?: number;
};

export function SystemTimeInput({ label, value, onChange, variant = "field" }: SystemTimeInputProps) {
    const { locale } = useI18n();
    const { colors, isDark } = useEarningsTheme();
    const fill = useSheetFill();
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
            onValueChange={(_, date) => {
                appHaptics.selection();
                onChange(date.getHours() * 60 + date.getMinutes());
            }}
            style={variant === "inline" ? { width: 104, height: 34 } : { width: "100%", height: 44 }}
        />
    );

    if (variant === "inline") return <View accessibilityLabel={label}>{picker}</View>;

    return (
        <View className="min-w-0 flex-1 gap-1.5">
            <Text className="font-sans text-[10px] font-semibold tracking-[1.2px] text-muted uppercase">{label}</Text>
            <View className="h-11 overflow-hidden rounded-[13px]" style={{ backgroundColor: fill }}>
                {picker}
            </View>
        </View>
    );
}
