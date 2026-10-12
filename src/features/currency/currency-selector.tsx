import { useState } from "react";
import { Text } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { IconTile, SettingsRow } from "@/components/settings-card";
import { useEarningsStore } from "@/features/earnings/store";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";
import { ForwardChevron } from "@/features/widgets/widget-glyphs";

import { type Currency, currencyName } from "./currencies";
import { convertible, sourceCurrency } from "./rates";
import { useCurrencyStore } from "./store";

export function useMainCurrencySetting() {
    const { t } = useI18n();
    const { main, hydrated, loading, loadError, saving, rates, ratesError } = useCurrencyStore();
    const converts = useEarningsStore((state) => state.sources.some((source) => convertible(sourceCurrency(source, main), main)));
    const unconvertible = useEarningsStore((state) => state.sources.some((source) => {
        const currency = sourceCurrency(source, main);
        return currency !== main && !convertible(currency, main);
    }));
    const [saveError, setSaveError] = useState(false);
    const ratesFailed = converts && ratesError && !rates;

    const change = async (value: Currency) => {
        if (value === main || saving) return;
        setSaveError(false);
        try {
            // Sources saved before currencies existed count in the old main currency; pin them so switching converts them.
            const earnings = useEarningsStore.getState();
            if (!earnings.ready) await earnings.load();
            if (!useEarningsStore.getState().ready) throw new Error("Payment sources unavailable.");
            await useEarningsStore.getState().adoptCurrency(main);
            await useCurrencyStore.getState().update(value);
        } catch {
            setSaveError(true);
        }
    };

    const errorHint = loadError || saveError
        ? t(loadError ? "settings.loadError" : "settings.saveError")
        : unconvertible
            ? t("home.notConvertible")
            : ratesFailed
                ? t("settings.currencyRatesError")
                : undefined;

    return {
        main,
        disabled: !hydrated || loading || loadError || saving,
        loadError,
        ratesFailed,
        errorHint,
        change,
    };
}

function CashIcon({ color }: { color: string }) {
    return (
        <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
            <Rect x={2.5} y={6} width={19} height={12} rx={2.5} />
            <Circle cx={12} cy={12} r={2.75} />
            <Path d="M6 9.5v5M18 9.5v5" strokeLinecap="round" />
        </Svg>
    );
}

export function CurrencyRow({ onPress }: { onPress: () => void }) {
    const { colors } = useEarningsTheme();
    const { t, locale } = useI18n();
    const main = useCurrencyStore((state) => state.main);
    const name = currencyName(main, locale);

    return (
        <SettingsRow
            testID="settings-currency"
            accessibilityRole="button"
            accessibilityLabel={`${t("settings.currency")}, ${name}`}
            onPress={() => {
                appHaptics.secondaryAction();
                onPress();
            }}
        >
            <IconTile>
                <CashIcon color={colors.accentDeep} />
            </IconTile>
            <Text className="flex-1 font-sans text-[15.5px] font-medium text-ink">{t("settings.currency")}</Text>
            <Text numberOfLines={1} className="max-w-[55%] font-sans text-[14px] text-muted">{name}</Text>
            <ForwardChevron color={colors.ink} />
        </SettingsRow>
    );
}
