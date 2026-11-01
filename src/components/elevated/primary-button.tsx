import type { ComponentProps, ReactNode } from "react";
import { Text, type TextStyle } from "react-native";

import { RaisedPressable } from "@/components/elevated/raised";
import { type EarningsColors, useEarningsTheme } from "@/features/earnings/theme";

type PrimaryButtonProps = Omit<
    ComponentProps<typeof RaisedPressable>,
    "surface" | "flat" | "depth" | "radius" | "className" | "containerClassName" | "children"
> & {
    label: string | ((textStyle: TextStyle) => ReactNode);
    icon?: (foreground: string) => ReactNode;
    // The onboarding previews a palette the app hasn't switched to yet.
    colors?: EarningsColors;
};

export function PrimaryButton({ label, icon, colors: colorsOverride, disabled, ...pressableProps }: PrimaryButtonProps) {
    const { colors: themeColors } = useEarningsTheme();
    const colors = colorsOverride ?? themeColors;
    const foreground = disabled ? colors.muted : colors.onAccent;
    const textStyle = disabled ? { color: colors.muted } : colors.onAccentText;

    return (
        <RaisedPressable
            accessibilityRole="button"
            accessibilityState={{ disabled: Boolean(disabled) }}
            {...pressableProps}
            disabled={disabled}
            containerClassName="w-full"
            surface={disabled ? "fill" : { face: colors.accent, edge: colors.edgeAccent }}
            flat={Boolean(disabled)}
            depth={4}
            radius={18}
            className="min-h-[56px] flex-row items-center justify-center gap-2 px-5"
        >
            {icon?.(foreground)}
            {typeof label === "string" ? (
                <Text className="font-sans text-[16px] font-bold" style={textStyle}>
                    {label}
                </Text>
            ) : (
                label(textStyle)
            )}
        </RaisedPressable>
    );
}
