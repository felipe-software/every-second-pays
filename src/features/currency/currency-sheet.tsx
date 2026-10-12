import type { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useRef } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSheet } from "@/components/app-sheet";
import { useI18n } from "@/features/i18n/i18n";

import type { Currency } from "./currencies";
import { CurrencyList } from "./currency-list";

export function CurrencySheet({
    value,
    onChange,
    onDismiss,
}: {
    value: Currency;
    onChange: (value: Currency) => void;
    onDismiss: () => void;
}) {
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const sheetRef = useRef<TrueSheet>(null);
    const dismiss = () => void sheetRef.current?.dismiss().catch(() => undefined);

    return (
        <AppSheet sheetRef={sheetRef} title={t("payment.currency")} closeTestID="close-currency-sheet" onDidDismiss={onDismiss}>
            <ScrollView
                className="flex-1"
                style={{ backgroundColor: "transparent" }}
                contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 4, paddingBottom: insets.bottom + 32 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <CurrencyList
                    value={value}
                    surface="fill"
                    live
                    onChange={onChange}
                    onPick={dismiss}
                />
            </ScrollView>
        </AppSheet>
    );
}
