import { NumberFlow } from "number-flow-react-native";
import { Text, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";

import { useEarningsTheme } from "./theme";

export function EarningsHeader({
    total,
    liveRate,
    ready,
    loadError,
}: {
    total: number;
    liveRate: number;
    ready: boolean;
    loadError: boolean;
}) {
    const { colors } = useEarningsTheme();
    const { t, locale, decimalSeparator, formatMoney } = useI18n();
    const displayTotal = Math.round(total * 100) / 100;
    const whole = Math.floor(displayTotal);
    const cents = Math.round((displayTotal - whole) * 100) % 100;

    const status = loadError
        ? t("home.sourcesUnavailable")
        : !ready
            ? t("home.loadingSources")
            : liveRate > 0
                ? t("home.everySecond", { amount: formatMoney(liveRate, 4) })
                : t("home.offTheClock");

    return (
        <View className="items-center pt-[54px]">
            <View className="min-h-[92px] flex-row items-center justify-center">
                <Text className="mr-1 font-sans text-[32px] font-medium text-muted">$</Text>
                <NumberFlow
                    value={whole}
                    mask
                    locales={locale}
                    format={{ maximumFractionDigits: 0 }}
                    trend={1}
                    style={{
                        color: colors.ink,
                        fontFamily: "Archivo-Bold",
                        fontSize: 88,
                        fontWeight: "700",
                        letterSpacing: -4.4,
                    }}
                />
                <Text className="font-sans text-[36px] font-semibold tracking-[-1px] text-muted">{decimalSeparator}</Text>
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
            <Text className="mt-4 font-sans text-[12.5px] font-semibold text-accent-deep">{status}</Text>
        </View>
    );
}
