import { useCallback, useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import { RaisedPressable } from "@/components/elevated/raised";
import { RiseIn } from "@/components/elevated/rise-in";
import { withTallDollar } from "@/features/currency/currency-text";
import { useI18n } from "@/features/i18n/i18n";
import { appHaptics } from "@/features/haptics/haptics";

import { LiveDot } from "./live-dot";
import type { PaymentSource } from "./model";
import type { SourceRowLabels } from "./source-row-labels";

const ROW_STAGGER = 60;
const MAX_ROW_DELAY = 480;

export function SourceRow({
    source,
    index,
    active,
    subtitle,
    state,
    earned,
    onPress,
    onValueNodeChange,
    transferId,
    transferDelay,
}: SourceRowLabels & {
    source: PaymentSource;
    index: number;
    onPress: (sourceId: number) => void;
    onValueNodeChange: (sourceId: number, node: View | null) => void;
    transferId: number | null;
    transferDelay: number;
}) {
    const { t } = useI18n();
    const setValueNode = useCallback(
        (node: View | null) => onValueNodeChange(source.id, node),
        [onValueNodeChange, source.id],
    );
    const launchPulse = useSharedValue(0);
    const launchStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: launchPulse.get() * -3 }, { scale: 1 + launchPulse.get() * 0.07 }],
    }));

    useEffect(() => {
        if (!transferId) return undefined;

        cancelAnimation(launchPulse);
        launchPulse.set(0);
        launchPulse.set(
            withDelay(
                transferDelay,
                withSequence(
                    ReduceMotion.System,
                    withTiming(1, {
                        duration: 90,
                        easing: Easing.out(Easing.quad),
                        reduceMotion: ReduceMotion.System,
                    }),
                    withSpring(0, {
                        damping: 12,
                        mass: 0.5,
                        stiffness: 230,
                        reduceMotion: ReduceMotion.System,
                    }),
                ),
                ReduceMotion.System,
            ),
        );

        return () => cancelAnimation(launchPulse);
    }, [launchPulse, transferDelay, transferId]);

    return (
        <RiseIn delay={Math.min(index * ROW_STAGGER, MAX_ROW_DELAY) + 120} distance={12}>
            <RaisedPressable
                accessibilityRole="button"
                accessibilityLabel={t("home.editSource", { name: source.name })}
                onPress={() => {
                    appHaptics.secondaryAction();
                    onPress(source.id);
                }}
                surface={active ? "active" : "card"}
                depth={3}
                radius={16}
                className="flex-row items-start gap-[18px] px-5 py-[18px]"
            >
                <View className="min-w-0 flex-1 gap-1.5">
                    <Text numberOfLines={1} className="font-sans text-[17px] font-semibold tracking-[-0.25px] text-ink">
                        {source.name}
                    </Text>
                    <Text numberOfLines={1} className="font-sans text-[12.5px] text-muted tabular-nums">
                        {subtitle}
                    </Text>
                </View>
                <View className="items-end gap-1.5">
                    <View ref={setValueNode} collapsable={false} testID={`source-value-${source.id}`}>
                        <Animated.View style={launchStyle}>
                            <Text
                                className={`font-sans text-[17px] font-semibold ${active || source.frequency === "once" ? "text-ink" : "text-muted"}`}
                            >
                                {withTallDollar(earned, 17)}
                            </Text>
                        </Animated.View>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        {active ? <LiveDot live size={6} /> : null}
                        <Text
                            className={`font-sans text-[12px] font-medium tabular-nums ${active ? "text-accent-deep" : "text-muted"}`}
                        >
                            {state}
                        </Text>
                    </View>
                </View>
            </RaisedPressable>
        </RiseIn>
    );
}
