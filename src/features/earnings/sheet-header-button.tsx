import { Text } from "react-native";

import { RaisedPressable } from "@/components/elevated/raised";

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

    return (
        <RaisedPressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onPress}
            testID={testID}
            // Dim the whole control: a translucent face would let its edge show through.
            containerStyle={{ opacity: disabled ? 0.55 : 1 }}
            surface={isClose ? "fill" : "danger"}
            depth={2}
            radius={isClose ? 18 : 11}
            className={isClose ? "h-9 w-9 items-center justify-center" : "h-9 justify-center px-3.5"}
        >
            <Text className={isClose
                ? "mt-[-2px] font-sans text-[21px] text-muted"
                : "font-sans text-[13px] font-semibold text-danger"}
            >
                {isClose ? "×" : label}
            </Text>
        </RaisedPressable>
    );
}
