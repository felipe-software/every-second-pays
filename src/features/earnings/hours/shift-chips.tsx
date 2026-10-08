import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { RaisedPressable } from "@/components/elevated/raised";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import type { Shift } from "../model";
import { useEarningsTheme } from "../theme";

function ShiftChip({
    shift,
    selected,
    removable,
    onPress,
    onRemove,
}: {
    shift: Shift;
    selected: boolean;
    removable: boolean;
    onPress: () => void;
    onRemove: () => void;
}) {
    const { colors } = useEarningsTheme();
    const { t, formatTimeRange } = useI18n();

    return (
        <RaisedPressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
                appHaptics.selection();
                onPress();
            }}
            surface={selected ? "chip" : "fill"}
            depth={2}
            radius={22}
            selected={selected}
            className="h-11 flex-row items-center gap-2 pr-3 pl-4"
        >
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.accent, opacity: selected ? 1 : 0.5 }} />
            <Text className="font-sans text-[14px] font-semibold tabular-nums" style={{ color: selected ? colors.ink : colors.muted }}>
                {formatTimeRange(shift.start, shift.end)}
            </Text>
            {selected && removable ? (
                <RaisedPressable
                    accessibilityRole="button"
                    accessibilityLabel={t("payment.removeTimeBlock")}
                    hitSlop={10}
                    onPress={() => {
                        appHaptics.selection();
                        onRemove();
                    }}
                    containerClassName="ml-0.5"
                    surface="raised"
                    depth={2}
                    radius={10}
                    className="h-5 w-5 items-center justify-center"
                >
                    <Text className="mt-[-1px] font-sans text-[13px] text-muted">×</Text>
                </RaisedPressable>
            ) : null}
        </RaisedPressable>
    );
}

export function ShiftChips({
    shifts,
    selectedIndex,
    onSelect,
    onAdd,
    onRemove,
}: {
    shifts: readonly Shift[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
}) {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();

    return (
        <View className="flex-row flex-wrap items-center gap-2">
            {shifts.map((shift, index) => (
                <ShiftChip
                    // Keyed by position so editing a shift keeps its chip mounted.
                    key={index}
                    shift={shift}
                    selected={index === selectedIndex}
                    removable={shifts.length > 1}
                    onPress={() => onSelect(index)}
                    onRemove={() => onRemove(index)}
                />
            ))}
            <RaisedPressable
                accessibilityRole="button"
                accessibilityLabel={t("payment.addTimeBlock")}
                onPress={() => {
                    appHaptics.selection();
                    onAdd();
                }}
                surface="fill"
                depth={2}
                radius={22}
                className="h-11 w-11 items-center justify-center"
            >
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M12 5v14M5 12h14" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" />
                </Svg>
            </RaisedPressable>
        </View>
    );
}
