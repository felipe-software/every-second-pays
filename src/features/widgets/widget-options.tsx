import { Children, Fragment, type ReactNode, useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
    Easing,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { CheckIcon } from "@/components/check-icon";
import { PopIn } from "@/components/elevated/pop-in";
import { Raised, usePressSink } from "@/components/elevated/raised";
import { useSquash } from "@/components/elevated/use-squash";
import { edgeColor, useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";

type Option<T extends string> = { value: T; label: string };

/** A titled group of rows on one raised card, with hairlines between the rows. */
export function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
    const rows = Children.toArray(children).filter(Boolean);
    return (
        <View className="mt-7">
            <Text className="mb-2.5 ml-1 font-sans text-[13px] font-semibold text-muted">{title}</Text>
            <Raised surface="row" depth={3} radius={20} className="overflow-hidden">
                {rows.map((row, index) => (
                    <Fragment key={index}>
                        {index > 0 ? <View className="mx-4 h-px bg-track opacity-40" /> : null}
                        {row}
                    </Fragment>
                ))}
            </Raised>
        </View>
    );
}

function Segment({
    label,
    selected,
    onPress,
    onPressIn,
    onPressOut,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
    onPressIn: () => void;
    onPressOut: () => void;
}) {
    const { colors } = useEarningsTheme();
    const squashStyle = useSquash(selected);
    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected }}
            onPress={onPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            className="flex-1 p-[3px]"
        >
            <Animated.View
                className="flex-1 items-center justify-center rounded-full"
                style={[{ backgroundColor: selected ? colors.accent : "transparent" }, squashStyle]}
            >
                <Text className="font-sans text-[13px] font-semibold" style={{ color: selected ? colors.ink : colors.muted }}>
                    {label}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

/** A small pill of equal segments; the whole pill sinks together. */
export function CompactSegments<T extends string>({
    options,
    value,
    onChange,
    testID,
}: {
    options: readonly Option<T>[];
    value: T;
    onChange: (value: T) => void;
    testID?: string;
}) {
    const sink = usePressSink();
    return (
        <View testID={testID} accessibilityRole="radiogroup">
            <Raised surface="row" depth={2} radius={18} pressed={sink.pressed} className="h-9 w-[228px] flex-row">
                {options.map((option) => (
                    <Segment
                        key={option.value}
                        label={option.label}
                        selected={option.value === value}
                        onPress={() => {
                            if (option.value === value) return;
                            appHaptics.selection();
                            onChange(option.value);
                        }}
                        onPressIn={sink.onPressIn}
                        onPressOut={sink.onPressOut}
                    />
                ))}
            </Raised>
        </View>
    );
}

function Swatch({ label, color, selected, onPress, children }: { label: string; color: string; selected: boolean; onPress: () => void; children?: ReactNode }) {
    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected }}
            onPress={onPress}
            hitSlop={4}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ borderColor: selected ? color : "transparent", borderWidth: 2 }}
        >
            <View
                className="h-7 w-7 items-center justify-center overflow-hidden rounded-full"
                style={{ backgroundColor: color, borderColor: edgeColor(color, { accent: true }), borderWidth: 1 }}
            >
                {children}
                <View className="absolute">
                    <PopIn visible={selected}>
                        <CheckIcon size={14} color="#FFFFFF" />
                    </PopIn>
                </View>
            </View>
        </Pressable>
    );
}

/** The color row: "same as the app" (drawn in the app's accent, half dimmed) and each palette. */
export function ColorRow<T extends string>({
    label,
    appValue,
    appLabel,
    appColor,
    swatches,
    value,
    onChange,
}: {
    label: string;
    appValue: T;
    appLabel: string;
    appColor: string;
    swatches: readonly { value: T; label: string; color: string }[];
    value: T;
    onChange: (value: T) => void;
}) {
    const choose = (next: T) => {
        if (next === value) return;
        appHaptics.selection();
        onChange(next);
    };
    const current = value === appValue ? appLabel : swatches.find((swatch) => swatch.value === value)?.label;
    return (
        <View className="px-4 pt-3.5 pb-3">
            <View className="flex-row items-center">
                <Text className="flex-1 font-sans text-[15.5px] font-medium text-ink">{label}</Text>
                <Text className="font-sans text-[14px] text-muted">{current}</Text>
            </View>
            <View className="mt-2.5 flex-row justify-between" accessibilityRole="radiogroup">
                <Swatch label={appLabel} color={appColor} selected={value === appValue} onPress={() => choose(appValue)}>
                    <View className="absolute right-0 h-full w-1/2" style={{ backgroundColor: "#00000033" }} />
                </Swatch>
                {swatches.map((swatch) => (
                    <Swatch
                        key={swatch.value}
                        label={swatch.label}
                        color={swatch.color}
                        selected={swatch.value === value}
                        onPress={() => choose(swatch.value)}
                    />
                ))}
            </View>
        </View>
    );
}

const SWITCH_TIMING = { duration: 180, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

/** A row with a label and a raised on/off switch. */
export function ToggleRow({ label, value, onChange, testID }: { label: string; value: boolean; onChange: (value: boolean) => void; testID?: string }) {
    const { colors } = useEarningsTheme();
    const sink = usePressSink();
    const progress = useSharedValue(value ? 1 : 0);
    const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.get() * 18 }] }));

    useEffect(() => {
        progress.set(withTiming(value ? 1 : 0, SWITCH_TIMING));
    }, [progress, value]);

    return (
        <Pressable
            testID={testID}
            accessibilityRole="switch"
            accessibilityLabel={label}
            accessibilityState={{ checked: value }}
            onPress={() => {
                appHaptics.selection();
                onChange(!value);
            }}
            onPressIn={sink.onPressIn}
            onPressOut={sink.onPressOut}
            className="min-h-[54px] flex-row items-center justify-between px-4"
        >
            <Text className="font-sans text-[15.5px] font-medium text-ink">{label}</Text>
            <Raised
                surface={value ? "accent" : "fill"}
                depth={2}
                radius={14}
                pressed={sink.pressed}
                className="h-7 w-[46px] justify-center px-[3px]"
            >
                <Animated.View
                    className="h-[20px] w-[20px] rounded-full"
                    style={[{ backgroundColor: value ? colors.canvas : colors.muted }, knobStyle]}
                />
            </Raised>
        </Pressable>
    );
}
