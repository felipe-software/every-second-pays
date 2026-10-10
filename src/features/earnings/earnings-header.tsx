import { NumberFlow } from "number-flow-react-native";
import { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { type MoneyTransfer, MoneyCounterCelebration } from "./money-counter-celebration";
import { PeriodButton } from "./period-button";
import { usePeriodStore } from "./period-store";
import { useEarningsTheme } from "./theme";

const SWIPE_DISTANCE = 30;

function wholeFontSize(characters: number) {
    return characters <= 5 ? 88 : characters === 6 ? 74 : 62;
}

function splitChangedWhole(formattedValue: string, changedDigitIndex: number) {
    let digitIndex = 0;

    for (let index = 0; index < formattedValue.length; index += 1) {
        const character = formattedValue[index];
        if (character < "0" || character > "9") continue;
        if (digitIndex === changedDigitIndex) {
            return [formattedValue.slice(0, index), formattedValue.slice(index)] as const;
        }
        digitIndex += 1;
    }

    return ["", formattedValue] as const;
}

export function EarningsHeader({
    total,
    ready,
    loadError,
    moneyTransfer,
}: {
    total: number;
    ready: boolean;
    loadError: boolean;
    moneyTransfer: MoneyTransfer | null;
}) {
    const { colors } = useEarningsTheme();
    const { locale, decimalSeparator, formatNumber } = useI18n();
    const period = usePeriodStore((state) => state.period);
    const cyclePeriod = usePeriodStore((state) => state.cycle);
    const stepPeriod = usePeriodStore((state) => state.step);
    const displayTotal = Math.round(total * 100) / 100;
    const whole = Math.floor(displayTotal);
    const cents = Math.round((displayTotal - whole) * 100) % 100;
    const wholeTargetRef = useRef<View>(null);
    const centsTargetRef = useRef<View>(null);
    const changedWhole = moneyTransfer?.target === "whole"
        ? splitChangedWhole(
            formatNumber(moneyTransfer.nextWhole, { maximumFractionDigits: 0 }),
            moneyTransfer.changedDigitIndex,
        )
        : null;
    const wholeSize = wholeFontSize(formatNumber(whole, { maximumFractionDigits: 0 }).length);
    const centsSize = Math.round(wholeSize * 0.41);
    const centsTracking = -centsSize / 36;
    const wholeNumberStyle = {
        color: colors.ink,
        fontFamily: "Archivo-Bold",
        fontSize: wholeSize,
        fontWeight: "700" as const,
        letterSpacing: -wholeSize * 0.05,
    };

    // Must activate sooner (±12) than the Android tab pager (±16) to win horizontal drags.
    const swipe = Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-14, 14])
        .runOnJS(true)
        .onEnd((event) => {
            if (Math.abs(event.translationX) < SWIPE_DISTANCE) return;
            if (stepPeriod(event.translationX < 0 ? 1 : -1)) appHaptics.selection();
        });

    return (
        <View className="items-center pt-[54px]" style={{ zIndex: 10 }}>
            <GestureDetector gesture={swipe}>
                {/* box-only: a swipe starting on NumberFlow's native Compose views makes Android cancel the next tap anywhere. */}
                <View collapsable={false} pointerEvents="box-only" className="self-stretch">
                    <MoneyCounterCelebration
                        transfer={ready && !loadError ? moneyTransfer : null}
                        wholeTargetRef={wholeTargetRef}
                        centsTargetRef={centsTargetRef}
                        size={wholeSize}
                    >
                        <Text className="mr-1 font-sans text-[32px] font-medium text-muted">$</Text>
                        <View collapsable={false}>
                            <NumberFlow
                                value={whole}
                                mask
                                locales={locale}
                                format={{ maximumFractionDigits: 0 }}
                                trend={1}
                                style={wholeNumberStyle}
                            />
                            {changedWhole ? (
                                <View
                                    pointerEvents="none"
                                    accessibilityElementsHidden
                                    importantForAccessibility="no-hide-descendants"
                                    style={styles.wholeMeasurement}
                                >
                                    <Text style={wholeNumberStyle}>{changedWhole[0]}</Text>
                                    <View ref={wholeTargetRef} collapsable={false}>
                                        <Text style={wholeNumberStyle}>{changedWhole[1]}</Text>
                                    </View>
                                </View>
                            ) : null}
                        </View>
                        <Text
                            className="font-sans font-semibold text-muted"
                            style={{ fontSize: centsSize, letterSpacing: centsTracking }}
                        >
                            {decimalSeparator}
                        </Text>
                        <View ref={centsTargetRef} collapsable={false}>
                            <NumberFlow
                                value={cents}
                                mask
                                locales={locale}
                                format={{ minimumIntegerDigits: 2, maximumFractionDigits: 0, useGrouping: false }}
                                trend={1}
                                style={{
                                    color: colors.muted,
                                    fontFamily: "Archivo-SemiBold",
                                    fontSize: centsSize,
                                    fontWeight: "600",
                                    letterSpacing: centsTracking,
                                }}
                            />
                        </View>
                    </MoneyCounterCelebration>
                </View>
            </GestureDetector>
            <View className="mt-3">
                <PeriodButton period={period} onPress={cyclePeriod} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wholeMeasurement: {
        position: "absolute",
        top: 0,
        left: 0,
        flexDirection: "row",
        opacity: 0,
    },
});
