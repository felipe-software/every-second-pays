import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { ElevatedSurface } from "@/components/elevated/elevated-pressable";
import { useSquash } from "@/components/elevated/use-squash";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { edgeColor, useEarningsTheme, useSheetFill } from "./theme";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_SETS = [
    { id: "weekdays", days: [1, 2, 3, 4, 5] },
    { id: "weekends", days: [0, 6] },
    { id: "everyDay", days: [0, 1, 2, 3, 4, 5, 6] },
] as const;

function sameDays(a: readonly number[], b: readonly number[]) {
    return [...a].sort().join() === [...b].sort().join();
}

function DayToggle({ day, selected, onPress }: { day: number; selected: boolean; onPress: () => void }) {
    const { colors } = useEarningsTheme();
    const { locale, weekdayName } = useI18n();
    const squashStyle = useSquash(selected);

    return (
        <Pressable
            accessibilityLabel={weekdayName(day, "long")}
            accessibilityState={{ selected }}
            onPress={() => {
                appHaptics.selection();
                onPress();
            }}
            className="flex-1 active:opacity-75"
        >
            <Animated.View
                className="flex-1 items-center justify-center"
                style={[{ backgroundColor: selected ? colors.accent : "transparent" }, squashStyle]}
            >
                <Text className="font-sans text-[14px] font-semibold" style={{ color: selected ? colors.ink : colors.muted }}>
                    {weekdayName(day, "narrow").toLocaleUpperCase(locale)}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

export function DaysEditor({ days, onChange }: { days: number[]; onChange: (days: number[]) => void }) {
    const { colors, isDark } = useEarningsTheme();
    const { t } = useI18n();
    const fill = useSheetFill();

    return (
        <View className="gap-4">
            <ElevatedSurface face={fill} edge={edgeColor(fill, { isDark })} radius={14} className="h-14 flex-row overflow-hidden">
                {DAY_ORDER.map((day) => {
                    const selected = days.includes(day);
                    return (
                        <DayToggle
                            key={day}
                            day={day}
                            selected={selected}
                            onPress={() => onChange(selected ? days.filter((value) => value !== day) : [...days, day].sort())}
                        />
                    );
                })}
            </ElevatedSurface>
            <View className="flex-row items-baseline gap-4 px-0.5">
                {DAY_SETS.map((option) => {
                    const selected = sameDays(option.days, days);
                    return (
                        <Pressable key={option.id} onPress={() => onChange([...option.days])} className="active:opacity-60">
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
