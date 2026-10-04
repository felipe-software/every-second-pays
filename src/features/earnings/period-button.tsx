import { Text } from "react-native";
import Svg, { Path } from "react-native-svg";

import { RaisedPressable } from "@/components/elevated/raised";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import type { EarningsPeriod } from "./model";
import { useEarningsTheme } from "./theme";

const PERIOD_KEYS: Record<EarningsPeriod, TranslationKey> = {
    today: "period.today",
    week: "period.week",
    month: "period.month",
    year: "period.year",
};

/** Stacked up and down chevrons: the button cycles through values in place. */
function CycleGlyph({ color }: { color: string }) {
    return (
        <Svg width={9} height={12} viewBox="0 0 9 12">
            <Path
                d="M1.5 4.5 4.5 1.5l3 3M1.5 7.5l3 3 3-3"
                fill="none"
                stroke={color}
                strokeOpacity={0.55}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

/** The raised pill under the total that names the period it shows; tapping moves to the next. */
export function PeriodButton({ period, onPress }: { period: EarningsPeriod; onPress: () => void }) {
    const { colors } = useEarningsTheme();
    const { t, locale } = useI18n();
    const label = t(PERIOD_KEYS[period]);

    return (
        <RaisedPressable
            testID="period-button"
            accessibilityRole="button"
            accessibilityLabel={t("period.accessibility", { period: label.toLocaleLowerCase(locale) })}
            onPress={() => {
                appHaptics.selection();
                onPress();
            }}
            hitSlop={8}
            surface="fill"
            depth={2}
            radius={8}
            squashKey={period}
            className="h-8 flex-row items-center gap-[7px] pr-[11px] pl-3"
        >
            <Text className="font-sans text-[14px] font-semibold text-ink">{label}</Text>
            <CycleGlyph color={colors.ink} />
        </RaisedPressable>
    );
}
