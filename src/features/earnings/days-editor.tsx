import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { Raised, RaisedPressable, usePressSink } from "@/components/elevated/raised";
import { useSquash } from "@/components/elevated/use-squash";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { useEarningsTheme } from "./theme";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_SETS = [
    { id: "weekdays", days: [1, 2, 3, 4, 5] },
    { id: "weekends", days: [0, 6] },
    { id: "everyDay", days: [0, 1, 2, 3, 4, 5, 6] },
] as const;

function sameDays(a: readonly number[], b: readonly number[]) {
    return [...a].sort().join() === [...b].sort().join();
}

function DayToggle({
    day,
    selected,
    onPress,
    onPressIn,
    onPressOut,
}: {
    day: number;
    selected: boolean;
    onPress: () => void;
    onPressIn: () => void;
    onPressOut: () => void;
}) {
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
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            className="flex-1"
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
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    // The strip is one raised control: pressing any day sinks all of it.
    const sink = usePressSink();

    return (
        <View className="gap-4">
            <Raised surface="fill" depth={3} radius={14} pressed={sink.pressed} className="h-14 flex-row overflow-hidden">
                {DAY_ORDER.map((day) => {
                    const selected = days.includes(day);
                    return (
                        <DayToggle
                            key={day}
                            day={day}
                            selected={selected}
                            onPress={() => onChange(selected ? days.filter((value) => value !== day) : [...days, day].sort())}
                            onPressIn={sink.onPressIn}
                            onPressOut={sink.onPressOut}
                        />
                    );
                })}
            </Raised>
            <View className="flex-row flex-wrap gap-2">
                {DAY_SETS.map((option) => {
                    const selected = sameDays(option.days, days);
                    return (
                        <RaisedPressable
                            key={option.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() => {
                                appHaptics.selection();
                                onChange([...option.days]);
                            }}
                            surface={selected ? "active" : "fill"}
                            depth={2}
                            radius={8}
                            selected={selected}
                            className="h-8 justify-center px-3"
                        >
                            <Text className="font-sans text-[12.5px] font-semibold" style={{ color: selected ? colors.accentDeep : colors.muted }}>
                                {t(`payment.daySet.${option.id}` as TranslationKey)}
                            </Text>
                        </RaisedPressable>
                    );
                })}
            </View>
        </View>
    );
}
