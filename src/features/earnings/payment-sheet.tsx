import type { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useRef, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSheet } from "@/components/app-sheet";
import { RiseIn } from "@/components/elevated/rise-in";
import { DEFAULT_CURRENCY } from "@/features/currency/currencies";
import { CurrencySheet } from "@/features/currency/currency-sheet";
import { useCurrencyStore } from "@/features/currency/store";
import { useI18n } from "@/features/i18n/i18n";
import { appHaptics } from "@/features/haptics/haptics";

import {
    EMPTY_DRAFT,
    type PaymentDraft,
    type PaymentSource,
    hoursPerDay,
    parseAmount,
    sourceToDraft,
} from "./model";
import { PaymentEditor, type PaymentToken } from "./payment-editor";
import { PrimaryButton } from "./payment-sheet-controls";
import { PaymentSummary } from "./payment-summary";
import { SheetHeaderButton } from "./sheet-header-button";

export { PrimaryButton } from "./payment-sheet-controls";

type PaymentSheetProps = {
    source?: PaymentSource;
    saving?: boolean;
    onDismiss: () => void;
    onDelete: (id: number) => Promise<void>;
    onSave: (draft: PaymentDraft, id?: number) => Promise<void>;
};

function cloneEmptyDraft(): PaymentDraft {
    return {
        ...EMPTY_DRAFT,
        days: [...EMPTY_DRAFT.days],
        shifts: EMPTY_DRAFT.shifts.map((shift) => ({ ...shift })),
    };
}

export function PaymentSheet({ source, saving = false, onDismiss, onDelete, onSave }: PaymentSheetProps) {
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const sheetRef = useRef<TrueSheet>(null);
    const [draft, setDraft] = useState<PaymentDraft>(() => ({
        ...(source ? sourceToDraft(source) : cloneEmptyDraft()),
        currency: source?.currency ?? useCurrencyStore.getState().main,
    }));
    const [token, setToken] = useState<PaymentToken>("name");
    const [currencyOpen, setCurrencyOpen] = useState(false);
    const [footerHeight, setFooterHeight] = useState(0);

    const amount = parseAmount(draft.amount);
    const recurring = draft.frequency !== "once";
    const missingRequired = !draft.name.trim() || !(amount > 0);
    const valid = !missingRequired
        && (!recurring || (draft.days.length > 0 && hoursPerDay(draft) > 0));

    const dismiss = () => {
        if (saving) return;
        void sheetRef.current?.dismiss().catch(() => undefined);
    };

    const saveAndDismiss = async () => {
        if (!valid || saving) return;
        const id = source?.id;
        try {
            await onSave(draft, id);
            dismiss();
        } catch {
            // The parent shows the error.
        }
    };

    const deleteAndDismiss = async () => {
        if (!source || saving) return;
        try {
            await onDelete(source.id);
            dismiss();
        } catch {
            // The parent shows the error.
        }
    };

    const submitLabel = saving
        ? t("payment.saving")
        : source
            ? t("payment.saveChanges")
            : recurring
                ? t("payment.startCounting")
                : t("payment.addPayment");

    return (
        <AppSheet
            sheetRef={sheetRef}
            title={t(source ? "payment.editTitle" : "payment.newTitle")}
            closeTestID="close-payment-sheet"
            dismissible={!saving}
            onDidDismiss={onDismiss}
            headerActions={source ? (
                <SheetHeaderButton
                    accessibilityLabel={t("payment.deleteAccessibility")}
                    disabled={saving}
                    kind="delete"
                    label={t("payment.delete")}
                    onPress={() => {
                        appHaptics.destructiveAction();
                        void deleteAndDismiss();
                    }}
                    testID="delete-source"
                />
            ) : null}
            footer={
                <View
                    onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
                    className="px-6 pt-3.5"
                    style={{ paddingBottom: 12 + (Platform.OS === "android" ? insets.bottom : 0) }}
                >
                    {missingRequired ? (
                        <Text accessibilityLiveRegion="polite" className="mb-3 text-center font-sans text-[12.5px] leading-[17px] text-muted">
                            {t("payment.requiredHint")}
                        </Text>
                    ) : null}
                    <PrimaryButton
                        label={submitLabel}
                        disabled={!valid || saving}
                        onPress={() => void saveAndDismiss()}
                        testID="save-source"
                    />
                </View>
            }
        >
            <PaymentSummary draft={draft} amount={amount} token={token} onTokenChange={setToken} />
            <ScrollView
                className="flex-1"
                style={{ backgroundColor: "transparent" }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 + footerHeight }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <RiseIn key={token}>
                    <PaymentEditor
                        draft={draft}
                        token={token}
                        onTokenChange={setToken}
                        onPatch={(patch) => setDraft((current) => ({ ...current, ...patch }))}
                        onOpenCurrency={() => setCurrencyOpen(true)}
                    />
                </RiseIn>
            </ScrollView>
            {currencyOpen ? (
                <CurrencySheet
                    title={t("payment.currency")}
                    closeTestID="close-currency-sheet"
                    value={draft.currency ?? DEFAULT_CURRENCY}
                    onChange={(currency) => setDraft((current) => ({ ...current, currency }))}
                    onDismiss={() => setCurrencyOpen(false)}
                />
            ) : null}
        </AppSheet>
    );
}
