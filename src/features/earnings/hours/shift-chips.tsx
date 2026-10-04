import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { mixColors } from "@/features/appearance/color";
import { ElevatedPressable } from "@/components/elevated/elevated-pressable";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import type { Shift } from "../model";
import { edgeColor, useEarningsTheme, useSheetCard, useSheetFill } from "../theme";

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
    const { colors, isDark } = useEarningsTheme();
    const { t, formatTimeRange } = useI18n();
    const fill = useSheetFill();
    const card = useSheetCard();
    const face = selected ? mixColors(card, colors.accent, 0.28) : fill;

    return (
        <ElevatedPressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
                appHaptics.selection();
                onPress();
            }}
            face={face}
            edge={edgeColor(face, { isDark })}
            depth={2}
            radius={22}
            selected={selected}
            className="h-11 flex-row items-center gap-2 border pr-3.5 pl-4"
            style={{ borderColor: selected ? mixColors(card, colors.accent, 0.6) : face }}
        >
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.accent, opacity: selected ? 1 : 0.5 }} />
            <Text className="font-sans text-[14px] font-semibold" style={{ color: selected ? colors.ink : colors.muted }}>
                {formatTimeRange(shift.start, shift.end)}
            </Text>
            {selected && removable ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("payment.removeTimeBlock")}
                    hitSlop={10}
                    onPress={() => {
                        appHaptics.selection();
                        onRemove();
                    }}
                    className="ml-0.5 h-5 w-5 items-center justify-center rounded-full active:opacity-60"
                    style={{ backgroundColor: `${colors.ink}1A` }}
                >
                    <Text className="mt-[-1px] font-sans text-[13px] text-muted">×</Text>
                </Pressable>
            ) : null}
        </ElevatedPressable>
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
    const { colors, isDark } = useEarningsTheme();
    const { t } = useI18n();
    const fill = useSheetFill();

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
            <ElevatedPressable
                accessibilityRole="button"
                accessibilityLabel={t("payment.addTimeBlock")}
                onPress={() => {
                    appHaptics.selection();
                    onAdd();
                }}
                face={fill}
                edge={edgeColor(fill, { isDark })}
                depth={2}
                radius={22}
                className="h-11 w-11 items-center justify-center"
            >
                <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M12 5v14M5 12h14" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" />
                </Svg>
            </ElevatedPressable>
        </View>
    );
}
