import { NumberFlow } from "number-flow-react-native";
import { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";

import { type MoneyTransfer, MoneyCounterCelebration } from "./money-counter-celebration";
import { useEarningsTheme } from "./theme";

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
    liveRate,
    ready,
    loadError,
    moneyTransfer,
}: {
    total: number;
    liveRate: number;
    ready: boolean;
    loadError: boolean;
    moneyTransfer: MoneyTransfer | null;
}) {
    const { colors } = useEarningsTheme();
    const { t, locale, decimalSeparator, formatMoney, formatNumber } = useI18n();
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
    const wholeNumberStyle = {
        color: colors.ink,
        fontFamily: "Archivo-Bold",
        fontSize: 88,
        fontWeight: "700" as const,
        letterSpacing: -4.4,
    };

    const status = loadError
        ? t("home.sourcesUnavailable")
        : !ready
            ? t("home.loadingSources")
            : liveRate > 0
                ? t("home.everySecond", { amount: formatMoney(liveRate, 4) })
                : t("home.offTheClock");

    return (
        <View className="items-center pt-[54px]" style={{ zIndex: 10 }}>
            <MoneyCounterCelebration
                transfer={ready && !loadError ? moneyTransfer : null}
                wholeTargetRef={wholeTargetRef}
                centsTargetRef={centsTargetRef}
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
                <Text className="font-sans text-[36px] font-semibold tracking-[-1px] text-muted">{decimalSeparator}</Text>
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
                            fontSize: 36,
                            fontWeight: "600",
                            letterSpacing: -1,
                        }}
                    />
                </View>
            </MoneyCounterCelebration>
            <Text className="mt-4 font-sans text-[12.5px] font-semibold text-accent-deep">{status}</Text>
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
