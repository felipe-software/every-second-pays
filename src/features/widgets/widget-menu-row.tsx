import { Pressable, Text } from "react-native";

import { appHaptics } from "@/features/haptics/haptics";

import type { WidgetMenuRowProps } from "./widget-menu-row.types";

/** Live widgets are Android-only; elsewhere the row just steps through the values. */
export function WidgetMenuRow<T extends string>({ label, value, options, onChange, testID }: WidgetMenuRowProps<T>) {
    const index = options.findIndex((option) => option.value === value);
    return (
        <Pressable
            testID={testID}
            accessibilityRole="button"
            onPress={() => {
                appHaptics.selection();
                onChange(options[(index + 1) % options.length].value);
            }}
            className="min-h-[54px] flex-row items-center gap-2 px-4"
        >
            <Text className="flex-1 font-sans text-[15.5px] font-medium text-ink">{label}</Text>
            <Text className="font-sans text-[14px] text-muted">{options[index]?.label}</Text>
        </Pressable>
    );
}
