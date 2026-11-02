import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { CheckIcon } from "@/components/check-icon";
import { PopIn } from "@/components/elevated/pop-in";
import { Raised, usePressSink } from "@/components/elevated/raised";
import { edgeColor, useEarningsTheme } from "@/features/earnings/theme";

export function Swatch({
    label,
    color,
    selected,
    onPress,
    children,
}: {
    label: string;
    color: string;
    selected: boolean;
    onPress: () => void;
    children?: ReactNode;
}) {
    const { colors } = useEarningsTheme();
    const sink = usePressSink();
    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected }}
            onPress={onPress}
            onPressIn={sink.onPressIn}
            onPressOut={sink.onPressOut}
            className="h-[46px] w-[46px] items-center justify-center rounded-full"
            style={{ borderColor: selected ? color : "transparent", borderWidth: 2 }}
        >
            <Raised
                surface={{ face: color, edge: edgeColor(color, { accent: true }) }}
                depth={3}
                radius={17}
                selected={selected}
                pressed={sink.pressed}
                ripple={sink.ripple}
                className="h-[34px] w-[34px] items-center justify-center overflow-hidden"
            >
                {children}
                <View className="absolute">
                    <PopIn visible={selected}>
                        <CheckIcon size={16} color={colors.onAccent} />
                    </PopIn>
                </View>
            </Raised>
        </Pressable>
    );
}
