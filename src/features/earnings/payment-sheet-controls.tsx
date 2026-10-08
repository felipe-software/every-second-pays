import { Text, TextInput } from "react-native";

import { RaisedPressable } from "@/components/elevated/raised";
import { appHaptics } from "@/features/haptics/haptics";

import { useEarningsTheme } from "./theme";

export function NativeField({
    value,
    onChangeText,
    placeholder,
    numeric = false,
    large = false,
}: {
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    numeric?: boolean;
    large?: boolean;
}) {
    const { colors } = useEarningsTheme();

    return (
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            keyboardType={numeric ? "decimal-pad" : "default"}
            autoCapitalize={numeric ? "none" : "words"}
            selectionColor={colors.accent}
            style={{
                height: large ? 76 : 58,
                paddingHorizontal: large ? 4 : 18,
                paddingVertical: large ? 8 : 15,
                backgroundColor: large ? "transparent" : colors.fill,
                borderRadius: 16,
                color: colors.ink,
                fontFamily: large ? "Archivo-Bold" : "Archivo-Medium",
                fontSize: large ? 44 : 19,
                fontWeight: large ? "700" : "500",
                lineHeight: large ? 52 : 26,
            }}
        />
    );
}

export function PrimaryButton({
    label,
    disabled,
    onPress,
    testID,
}: {
    label: string;
    disabled?: boolean;
    onPress: () => void;
    testID?: string;
}) {
    const { colors } = useEarningsTheme();

    return (
        <RaisedPressable
            accessibilityRole="button"
            accessibilityState={{ disabled: Boolean(disabled) }}
            disabled={disabled}
            onPress={() => {
                appHaptics.primaryAction();
                onPress();
            }}
            testID={testID}
            containerClassName="w-full"
            surface={disabled ? "fill" : "accent"}
            flat={disabled}
            depth={4}
            radius={17}
            className="h-[54px] items-center justify-center"
        >
            <Text
                className="font-sans text-[15.5px] font-semibold"
                style={{ color: disabled ? colors.muted : colors.ink }}
            >
                {label}
            </Text>
        </RaisedPressable>
    );
}

/** A tappable word in the payment sentence. */
export function TokenButton({
    active,
    children,
    onPress,
}: {
    active: boolean;
    children: string;
    onPress: () => void;
}) {
    return (
        <RaisedPressable
            accessibilityRole="button"
            accessibilityLabel={children}
            accessibilityState={{ selected: active }}
            onPress={() => {
                appHaptics.selection();
                onPress();
            }}
            containerClassName="mr-[-3px]"
            surface={active ? "active" : "fill"}
            depth={2}
            radius={7}
            selected={active}
            className="items-center px-2 pb-px"
        >
            <Text numberOfLines={1} className="font-sans text-[24px] leading-[27px] font-semibold text-ink tabular-nums">{children}</Text>
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
            surface={selected ? "accent" : "fill"}
            depth={3}
            radius={13}
            selected={selected}
            className={`${wide ? "h-[50px]" : "px-[15px] py-2.5"} items-center justify-center`}
        >
            <Text className="font-sans text-[13.5px] font-semibold" style={{ color: selected ? colors.ink : colors.muted }}>
                {label}
            </Text>
        </RaisedPressable>
    );
}
