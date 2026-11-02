import { type ReactNode, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { LineIcon } from "@/components/line-icon";
import { Card, IconTile, usePressHighlight } from "@/components/settings-card";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";

const EXPAND_TIMING = { duration: 240, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

export function CollapsibleCard({
    icon,
    title,
    testID,
    children,
}: {
    icon: string;
    title: string;
    testID?: string;
    children: ReactNode;
}) {
    const { colors } = useEarningsTheme();
    const [open, setOpen] = useState(false);
    const [opened, setOpened] = useState(false);
    const highlight = usePressHighlight();
    const progress = useSharedValue(0);
    const contentHeight = useSharedValue(0);
    const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${progress.get() * 180}deg` }] }));
    const bodyStyle = useAnimatedStyle(() => ({
        height: contentHeight.get() * progress.get(),
        opacity: progress.get(),
    }));

    useEffect(() => {
        progress.set(withTiming(open ? 1 : 0, EXPAND_TIMING));
    }, [open, progress]);

    return (
        <View className="mt-3">
            <Card className="overflow-hidden">
                <Pressable
                    testID={testID}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => {
                        appHaptics.selection();
                        setOpened(true);
                        setOpen((value) => !value);
                    }}
                    onPressIn={highlight.onPressIn}
                    onPressOut={highlight.onPressOut}
                    android_ripple={highlight.android_ripple}
                    className="min-h-[60px] flex-row items-center gap-3 px-4"
                    style={highlight.style}
                >
                    <IconTile>
                        <LineIcon d={icon} color={colors.accentDeep} />
                    </IconTile>
                    <Text className="flex-1 font-sans text-[16px] font-semibold tracking-[-0.2px] text-ink">
                        {title}
                    </Text>
                    <Animated.View style={[{ opacity: 0.6 }, chevronStyle]}>
                        <LineIcon d="m6 9 6 6 6-6" color={colors.ink} size={18} strokeWidth={2.2} />
                    </Animated.View>
                </Pressable>
                <Animated.View
                    pointerEvents={open ? "auto" : "none"}
                    importantForAccessibility={open ? "auto" : "no-hide-descendants"}
                    accessibilityElementsHidden={!open}
                    className="overflow-hidden"
                    style={bodyStyle}
                >
                    <View
                        className="absolute inset-x-0 top-0"
                        onLayout={(event) => contentHeight.set(event.nativeEvent.layout.height)}
                    >
                        {opened ? children : null}
                    </View>
                </Animated.View>
            </Card>
        </View>
    );
}
