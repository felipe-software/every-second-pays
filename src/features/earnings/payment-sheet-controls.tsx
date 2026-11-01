import type { ReactNode } from "react";
import { Text, TextInput } from "react-native";

import { RaisedPressable } from "@/components/elevated/raised";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { useEarningsTheme } from "./theme";

export function AmountInput({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
    const { colors } = useEarningsTheme();

    return (
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder="0"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            selectionColor={colors.accent}
            style={{
                height: 76,
                paddingHorizontal: 4,
                paddingVertical: 8,
                color: colors.ink,
                fontFamily: "Archivo-Bold",
                fontSize: 44,
                fontWeight: "700",
                lineHeight: 52,
            }}
        />
    );
}

export function TokenButton({
    active,
    children,
    reserve,
    missing = false,
    format,
    onPress,
}: {
    active: boolean;
    children: string;
    reserve?: readonly string[];
    missing?: boolean;
    format?: (text: string) => ReactNode;
    onPress: () => void;
}) {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();

    return (
        <RaisedPressable
            accessibilityRole="button"
            accessibilityLabel={missing ? `${children}, ${t("payment.required")}` : children}
            accessibilityState={{ selected: active }}
            onPress={() => {
                appHaptics.selection();
                onPress();
            }}
            containerClassName="mr-[-3px]"
            surface={active ? "active" : "card"}
            depth={2}
            radius={7}
            selected={active}
            className="items-center px-2 pb-px"
        >
            {reserve?.map((value) => (
                <Text
                    key={value}
                    aria-hidden
                    numberOfLines={1}
                    className="h-0 font-sans text-[24px] font-semibold opacity-0"
                >
                    {value}
                </Text>
            ))}
            <Text numberOfLines={1} className="font-sans text-[24px] leading-[27px] font-semibold text-ink tabular-nums">
                {format ? format(children) : children}
                {missing ? <Text style={{ color: colors.danger }}>*</Text> : null}
            </Text>
        </RaisedPressable>
    );
}

export function ChoiceChip({ selected, label, onPress, wide = false }: { selected: boolean; label: string; onPress: () => void; wide?: boolean }) {
    const { colors } = useEarningsTheme();

    return (
        <RaisedPressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
                appHaptics.selection();
                onPress();
            }}
            containerClassName={wide ? "min-w-[30%] flex-1" : undefined}
            surface={selected ? "accent" : "card"}
            depth={3}
            radius={13}
            selected={selected}
            className={`${wide ? "h-[50px]" : "px-[15px] py-2.5"} items-center justify-center`}
        >
            <Text className="font-sans text-[13.5px] font-semibold" style={selected ? colors.onAccentText : { color: colors.muted }}>
                {label}
            </Text>
        </RaisedPressable>
    );
}
