import { Text } from "react-native";

import { ElevatedPressable } from "@/components/elevated/elevated-pressable";
import { mixColors } from "@/features/appearance/color";

import { edgeColor, useEarningsTheme, useSheetFill } from "./theme";

type SheetHeaderButtonProps = {
    accessibilityLabel: string;
    disabled?: boolean;
    kind: "close" | "delete";
    label?: string;
    onPress: () => void;
    testID: string;
};

export function SheetHeaderButton({
    accessibilityLabel,
    disabled = false,
    kind,
    label,
    onPress,
    testID,
}: SheetHeaderButtonProps) {
    const isClose = kind === "close";
    const { colors, isDark } = useEarningsTheme();
    const fill = useSheetFill();
    const face = isClose ? fill : mixColors(colors.canvas, colors.danger, 0.1);

    return (
        <ElevatedPressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onPress}
            testID={testID}
            face={face}
            edge={edgeColor(face, { isDark })}
            depth={2}
            radius={isClose ? 18 : 11}
            className={isClose ? "h-9 w-9 items-center justify-center" : "h-9 justify-center px-3.5"}
            style={{ opacity: disabled ? 0.55 : 1 }}
        >
            <Text className={isClose
                ? "mt-[-2px] font-sans text-[21px] text-muted"
                : "font-sans text-[13px] font-semibold text-danger"}
            >
                {isClose ? "×" : label}
            </Text>
        </ElevatedPressable>
    );
}
