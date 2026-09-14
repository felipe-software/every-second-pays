import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

import { useI18n } from "@/features/i18n/i18n";

import {
    EMPTY_DRAFT,
    type PaymentDraft,
    type PaymentSource,
    currentShift,
    hoursPerDay,
    parseAmount,
    ratePerSecond,
    sourceToDraft,
} from "./model";
import { PaymentEditor, type PaymentToken } from "./payment-editor";
import { PrimaryButton } from "./payment-sheet-controls";
import { PaymentSummary } from "./payment-summary";
import { useEarningsTheme } from "./theme";

export { PrimaryButton } from "./payment-sheet-controls";

type PaymentSheetProps = {
    source?: PaymentSource;
    now: Date;
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

export function PaymentSheet({ source, now, saving = false, onDismiss, onDelete, onSave }: PaymentSheetProps) {
    const { colors } = useEarningsTheme();
    const { t, formatMoney, formatTime } = useI18n();
    const sheetRef = useRef<TrueSheet>(null);
    const [draft, setDraft] = useState<PaymentDraft>(() => source ? sourceToDraft(source) : cloneEmptyDraft());
    const [token, setToken] = useState<PaymentToken>("name");

    const amount = parseAmount(draft.amount);
    const calculationSource = useMemo<PaymentSource>(
        () => ({ ...draft, id: source?.id ?? -1, amount }),
        [amount, draft, source?.id],
    );
    const rate = ratePerSecond(calculationSource);
    const shift = currentShift(calculationSource, now);
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
            // The parent owns the localized user-facing error message.
        }
    };

    const deleteAndDismiss = async () => {
        if (!source || saving) return;
        try {
            await onDelete(source.id);
            dismiss();
        } catch {
            // The parent owns the localized user-facing error message.
        }
    };

    const nowLine = recurring
        ? shift
            ? t("payment.workingNow", { time: formatTime(shift.end) })
            : draft.days.length && hoursPerDay(draft) > 0
                ? t("payment.notWorkingNow")
                : t("payment.pickSchedule")
        : draft.when === "later"
            ? t("payment.heldUntilDate")
            : t("payment.landsToday");

    const submitLabel = saving
        ? t("payment.saving")
        : source
            ? t("payment.saveChanges")
            : recurring
                ? t("payment.startCounting")
                : t("payment.addPayment");

    return (
        <TrueSheet
            ref={sheetRef}
            backgroundColor={Platform.OS === "ios" ? undefined : colors.sheet}
            detents={[0.82, 1]}
            initialDetentIndex={0}
            dimmed
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
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("payment.deleteAccessibility")}
                            disabled={saving}
                            onPress={() => void deleteAndDismiss()}
                            className="h-9 justify-center rounded-[11px] bg-danger/10 px-3.5 active:opacity-65"
                        >
                            <Text className="font-sans text-[13px] font-semibold text-danger">{t("payment.delete")}</Text>
                        </Pressable>
                    ) : null}
                    <Pressable
                        accessibilityLabel={t("common.close")}
                        accessibilityRole="button"
                        onPress={dismiss}
                        className="h-9 w-9 items-center justify-center rounded-full bg-soft/80 active:opacity-65"
                    >
                        <Text className="mt-[-2px] font-sans text-[21px] text-muted">×</Text>
                    </Pressable>
                </View>
            }
            footer={
                <View className="gap-3 px-6 pt-3.5 pb-3">
                    <View className="flex-row items-center gap-[9px]">
                        <View
                            className="h-2 w-2 rounded-full"
                            style={{
                                backgroundColor: shift ? colors.accent : colors.field,
                                shadowColor: colors.accent,
                                shadowOpacity: shift ? 0.45 : 0,
                                shadowRadius: 5,
                            }}
                        />
                        <Text className="min-w-0 flex-1 font-sans text-[12.5px] font-medium text-ink">{nowLine}</Text>
                        <Text className="font-sans text-[12.5px] font-semibold text-muted">
                            {recurring && rate > 0
                                ? t("payment.ratePerSecond", { amount: formatMoney(rate, 4) })
                                : !recurring && amount > 0
                                    ? `$${formatMoney(amount)}`
                                    : ""}
                        </Text>
                    </View>
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
                style={{ backgroundColor: colors.sheetContent }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <PaymentEditor
                    draft={draft}
                    token={token}
                    onTokenChange={setToken}
                    onPatch={(patch) => setDraft((current) => ({ ...current, ...patch }))}
                />
            </ScrollView>
        </TrueSheet>
    );
}
