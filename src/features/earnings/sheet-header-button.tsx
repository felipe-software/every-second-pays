import { Pressable, Text } from "react-native";

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
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onPress}
            testID={testID}
            className={isClose
                ? "h-9 w-9 items-center justify-center rounded-full bg-soft/80 active:opacity-65"
                : "h-9 justify-center rounded-[11px] bg-danger/10 px-3.5 active:opacity-65"}
        >
            <Text className={isClose
                ? "mt-[-2px] font-sans text-[21px] text-muted"
                : "font-sans text-[13px] font-semibold text-danger"}
            >
                {isClose ? "×" : label}
            </Text>
        </Pressable>
    );
}
