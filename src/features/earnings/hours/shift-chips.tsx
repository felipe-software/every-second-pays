import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Chip } from "@/components/elevated/chip";
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
        <Chip
            label={formatTimeRange(shift.start, shift.end)}
            selected={selected}
            onPress={onPress}
            leading={<View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.accent, opacity: selected ? 1 : 0.5 }} />}
            trailing={selected && removable ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("payment.removeTimeBlock")}
                    hitSlop={10}
                    onPress={() => {
                        appHaptics.selection();
                        onRemove();
                    }}
                    className="h-5 w-5 items-center justify-center"
                >
                    <Text className="mt-[-1px] font-sans text-[13px] text-ink">×</Text>
                </Pressable>
            ) : undefined}
        />
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
            <Chip
                accessibilityLabel={t("payment.addTimeBlock")}
                onPress={onAdd}
                leading={(
                    <Svg width={14} height={14} viewBox="0 0 24 24">
                        <Path d="M12 5v14M5 12h14" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" />
                    </Svg>
                )}
            />
        </View>
    );
}
