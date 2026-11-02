import { Text, View } from "react-native";

import { TryAgainButton } from "@/components/try-again-button";
import { useI18n } from "@/features/i18n/i18n";

import { useMainCurrencySetting } from "./currency-selector";
import { CurrencySheet } from "./currency-sheet";
import { useCurrencyStore } from "./store";

function retryLoad() {
    void useCurrencyStore.getState().load();
}

function retryRates() {
    void useCurrencyStore.getState().refreshRates({ force: true });
}

function retryAction(loadError: boolean, ratesFailed: boolean) {
    if (loadError) return retryLoad;
    return ratesFailed ? retryRates : null;
}

export function MainCurrencySheet({ onDismiss }: { onDismiss: () => void }) {
    const { t } = useI18n();
    const { main, disabled, loadError, ratesFailed, errorHint, change } = useMainCurrencySetting();
    const retry = retryAction(loadError, ratesFailed);

    return (
        <CurrencySheet
            title={t("settings.currency")}
            value={main}
            disabled={disabled}
            closeTestID="close-main-currency-sheet"
            onChange={(currency) => {
                void change(currency);
            }}
            onDismiss={onDismiss}
            notice={
                errorHint ? (
                    <View className="mt-4 gap-3">
                        <Text
                            accessibilityLiveRegion="polite"
                            className="px-1 font-sans text-[13px] leading-5 text-muted"
                        >
                            {errorHint}
                        </Text>
                        {retry ? <TryAgainButton onPress={retry} /> : null}
                    </View>
                ) : null
            }
        />
    );
}
