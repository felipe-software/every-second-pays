import type { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useRef, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RiseIn } from "@/components/elevated/rise-in";
import { RecedingSheet, SHEET_RECEDE_ENABLED } from "@/components/sheet-recede";
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
import { useEarningsTheme } from "./theme";

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
    const { colors, isDark } = useEarningsTheme();
    const { t } = useI18n();
    const sheetRef = useRef<TrueSheet>(null);
    const [draft, setDraft] = useState<PaymentDraft>(() => source ? sourceToDraft(source) : cloneEmptyDraft());
    const [token, setToken] = useState<PaymentToken>("name");
    const [footerHeight, setFooterHeight] = useState(0);

    const amount = parseAmount(draft.amount);
    const recurring = draft.frequency !== "once";
    const valid = draft.name.trim().length > 0
        && amount > 0
        && (!recurring || (draft.days.length > 0 && hoursPerDay(draft) > 0));

    const dismiss = () => {
        if (saving) return;
        void sheetRef.current?.dismiss().catch(() => undefined);
    };

    const saveAndDismiss = async () => {
        if (!valid || saving) return;
        try {
            await onSave(draft, source?.id);
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
        <RecedingSheet
            ref={sheetRef}
            backgroundColor={Platform.OS === "ios" ? undefined : colors.canvas}
            detents={[0.82, 1]}
            initialDetentIndex={0}
            dimmed
            // A black dim hides the canvas-colored sheet in dark mode, so lift the backdrop unless the page recedes.
            dimmedColor={isDark && !SHEET_RECEDE_ENABLED ? colors.track : undefined}
            dismissible={!saving}
            draggable={!saving}
            grabber
            scrollable
            presentation="page"
            onDidDismiss={onDismiss}
            headerStyle={{ backgroundColor: "transparent" }}
            footerStyle={{ backgroundColor: "transparent" }}
            header={
                <View className="flex-row items-center gap-3 px-[22px] pt-6 pb-4">
                    <Text className="min-w-0 flex-1 font-sans text-[24px] font-bold tracking-[-0.65px] text-ink">
                        {t(source ? "payment.editTitle" : "payment.newTitle")}
                    </Text>
                    {source ? (
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
                    <SheetHeaderButton
                        accessibilityLabel={t("common.close")}
                        kind="close"
                        onPress={() => {
                            appHaptics.dismiss();
                            dismiss();
                        }}
                        testID="close-payment-sheet"
                    />
                </View>
            }
            footer={
                <View
                    onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
                    className="px-6 pt-3.5"
                    style={{ paddingBottom: 12 + (Platform.OS === "android" ? insets.bottom : 0) }}
                >
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
                    />
                </RiseIn>
            </ScrollView>
        </RecedingSheet>
    );
}
