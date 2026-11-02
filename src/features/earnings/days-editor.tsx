import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { Chip } from "@/components/elevated/chip";
import { Raised, usePressSink } from "@/components/elevated/raised";
import { rippleConfig } from "@/components/elevated/ripple";
import { useSquash } from "@/components/elevated/use-squash";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { useEarningsTheme } from "./theme";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_SETS = [
    { id: "weekdays", days: [1, 2, 3, 4, 5] },
    { id: "weekends", days: [0, 6] },
    { id: "everyDay", days: [0, 1, 2, 3, 4, 5, 6] },
] as const;

function byStringOrder(a: number, b: number) {
    const left = String(a);
    const right = String(b);
    if (left < right) return -1;
    return left > right ? 1 : 0;
}

function inStringOrder(days: readonly number[]) {
    const sorted = [...days];
    sorted.sort(byStringOrder);
    return sorted;
}

function sameDays(a: readonly number[], b: readonly number[]) {
    return inStringOrder(a).join() === inStringOrder(b).join();
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
            android_ripple={rippleConfig(colors.ink)}
            className="flex-1"
        >
            <Animated.View
                className="flex-1 items-center justify-center"
                style={[{ backgroundColor: selected ? colors.accent : "transparent" }, squashStyle]}
            >
                <Text
                    className="font-sans text-[14px] font-semibold"
                    style={selected ? colors.onAccentText : { color: colors.muted }}
                >
                    {weekdayName(day, "narrow").toLocaleUpperCase(locale)}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

export function DaysEditor({ days, onChange }: { days: number[]; onChange: (days: number[]) => void }) {
    const { t } = useI18n();
    const sink = usePressSink();

    return (
        <View className="gap-4">
            <Raised
                surface="card"
                depth={3}
                radius={14}
                pressed={sink.pressed}
                className="h-14 flex-row overflow-hidden"
            >
                {DAY_ORDER.map((day) => {
                    const selected = days.includes(day);
                    return (
                        <DayToggle
                            key={day}
                            day={day}
                            selected={selected}
                            onPress={() =>
                                onChange(
                                    selected ? days.filter((value) => value !== day) : inStringOrder([...days, day]),
                                )
                            }
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
                        <Chip
                            key={option.id}
                            label={t(`payment.daySet.${option.id}`)}
                            selected={selected}
                            onPress={() => onChange([...option.days])}
                        />
                    );
                })}
            </View>
        </View>
    );
}
