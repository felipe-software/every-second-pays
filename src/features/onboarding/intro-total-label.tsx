import { StyleSheet, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";

import { DAY_PAY, MONTH_PAY, YEAR_PAY } from "./intro-timeline";

export type Period = "day" | "week" | "month" | "year";

const PERIOD_KEYS = {
    day: "onboarding.perDay",
    week: "onboarding.perWeek",
    month: "onboarding.perMonth",
    year: "onboarding.perYear",
} as const;

const PERIOD_PAY: Record<Period, number> = { day: DAY_PAY, week: DAY_PAY * 5, month: MONTH_PAY, year: YEAR_PAY };

export function IntroTotalLabel({ landed }: { landed: Period | null }) {
    const { t, formatNumber } = useI18n();
    return (
        <View
            accessible={landed !== null}
            accessibilityLiveRegion="polite"
            accessibilityLabel={
                landed
                    ? t("onboarding.counterExample", {
                          amount: formatNumber(PERIOD_PAY[landed]),
                          period: t(PERIOD_KEYS[landed]),
                      })
                    : undefined
            }
            style={styles.total}
        />
    );
}

const styles = StyleSheet.create({
    total: {
        position: "absolute",
        top: 89,
        left: 40,
        right: 40,
        height: 150,
    },
});
