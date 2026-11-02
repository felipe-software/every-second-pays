import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { CardDivider, usePressHighlight } from "@/components/settings-card";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";

const SWITCH_TIMING = { duration: 180, easing: Easing.bezier(0.2, 0.8, 0.3, 1), reduceMotion: ReduceMotion.System };

export function SwitchRow({
    label,
    value,
    onChange,
    disabled = false,
    divider = true,
    testID,
}: {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    divider?: boolean;
    testID?: string;
}) {
    const { colors } = useEarningsTheme();
    const highlight = usePressHighlight();
    const progress = useSharedValue(value ? 1 : 0);
    const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.get() * 18 }] }));

    useEffect(() => {
        progress.set(withTiming(value ? 1 : 0, SWITCH_TIMING));
    }, [progress, value]);

    return (
        <>
            {divider ? <CardDivider /> : null}
            <Pressable
                testID={testID}
                accessibilityRole="switch"
                accessibilityLabel={label}
                accessibilityState={{ checked: value, disabled }}
                disabled={disabled}
                onPress={() => {
                    appHaptics.selection();
                    onChange(!value);
                }}
                onPressIn={highlight.onPressIn}
                onPressOut={highlight.onPressOut}
                android_ripple={highlight.android_ripple}
                className="min-h-[54px] flex-row items-center gap-3 px-4"
                style={[highlight.style, { opacity: disabled ? 0.5 : 1 }]}
            >
                <Text className="flex-1 font-sans text-[15.5px] font-medium text-ink">{label}</Text>
                <View
                    className="h-7 w-[46px] justify-center rounded-[14px] px-[3px]"
                    style={{ backgroundColor: value ? colors.accent : colors.track }}
                >
                    <Animated.View
                        className="h-[22px] w-[22px] rounded-full bg-white"
                        style={[{ boxShadow: "0 1px 3px rgba(0, 0, 0, 0.25)" }, knobStyle]}
                    />
                </View>
            </Pressable>
        </>
    );
}
