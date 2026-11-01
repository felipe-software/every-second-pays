import type { ComponentProps, ReactNode } from "react";
import { Text } from "react-native";

import { RaisedPressable } from "@/components/elevated/raised";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";

type ChipProps = Omit<ComponentProps<typeof RaisedPressable>, "surface" | "flat" | "depth" | "radius" | "className" | "children" | "selected"> & {
    label?: string;
    selected?: boolean;
    leading?: ReactNode;
    trailing?: ReactNode;
};

export function Chip({ label, selected = false, leading, trailing, onPress, ...pressableProps }: ChipProps) {
    const { colors } = useEarningsTheme();

    return (
        <RaisedPressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            {...pressableProps}
            onPress={(event) => {
                appHaptics.selection();
                onPress?.(event);
            }}
            surface={selected ? "active" : "card"}
            depth={2}
            radius={8}
            selected={selected}
            className={`h-8 flex-row items-center justify-center gap-1.5 ${label ? "px-3" : "w-8"}`}
        >
            {leading}
            {label ? (
                <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className="min-w-0 shrink font-sans text-[12.5px] font-semibold tabular-nums"
                    style={{ color: selected ? colors.ink : colors.muted }}
                >
                    {label}
                </Text>
            ) : null}
            {trailing}
        </RaisedPressable>
    );
}
