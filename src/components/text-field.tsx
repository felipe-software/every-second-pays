import type { ComponentProps, ReactNode } from "react";
import { TextInput, View } from "react-native";

import { useEarningsTheme } from "@/features/earnings/theme";

type TextFieldProps = Omit<ComponentProps<typeof TextInput>, "style" | "className" | "placeholderTextColor" | "selectionColor"> & {
    leading?: ReactNode;
    trailing?: ReactNode;
    containerClassName?: string;
};

export function TextField({ leading, trailing, containerClassName = "", ...inputProps }: TextFieldProps) {
    const { colors, isDark } = useEarningsTheme();

    return (
        <View
            className={`h-12 flex-row items-center gap-2.5 rounded-[16px] pl-3.5 ${trailing ? "pr-1.5" : "pr-3.5"} ${containerClassName}`}
            style={{ backgroundColor: colors.cardFace, borderWidth: 1, borderColor: isDark ? colors.cardFace : colors.cardOutline }}
        >
            {leading}
            <TextInput
                {...inputProps}
                placeholderTextColor={colors.muted}
                selectionColor={colors.accent}
                className="h-full min-w-0 flex-1"
                style={{ padding: 0, color: colors.ink, fontFamily: "Archivo", fontSize: 16 }}
            />
            {trailing}
        </View>
    );
}
