import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import type { PaymentDraft, PaymentSource } from "./model";
import { useEarningsStore } from "./store";
import { useEarningsTheme } from "./theme";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const FULL_DAY = [{ start: 0, end: 1440 }];

function nextNumericName(sources: PaymentSource[]) {
    const names = new Set(sources.map((source) => source.name.trim()));
    let candidate = 1;

    while (names.has(String(candidate))) candidate += 1;
    return String(candidate);
}

function createJob(sources: PaymentSource[], active: boolean): PaymentDraft {
    return {
        name: nextNumericName(sources),
        amount: "10000",
        frequency: "month",
        when: "today",
        days: active ? [...ALL_DAYS] : [],
        shifts: FULL_DAY.map((shift) => ({ ...shift })),
    };
}

export function DevJobControls() {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    const earningsSaving = useEarningsStore((state) => state.saving);
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState(false);
    const disabled = adding || earningsSaving;

    if (!__DEV__) return null;

    const addJob = async (active: boolean) => {
        if (disabled) return;

        setAdding(true);
        setAddError(false);
        try {
            const store = useEarningsStore.getState();
            if (!store.ready) await store.load();

            const loadedStore = useEarningsStore.getState();
            await loadedStore.save(createJob(loadedStore.sources, active));
            appHaptics.primaryAction();
        } catch {
            setAddError(true);
        } finally {
            setAdding(false);
        }
    };

    return (
        <View className="mt-8">
            <Text className="mb-3 ml-1 font-sans text-[13px] font-semibold text-muted">
                {t("settings.developer")}
            </Text>
            <View className="gap-2 rounded-[20px] bg-row p-3">
                <Pressable
                    testID="add-always-active-job"
                    accessibilityRole="button"
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => void addJob(true)}
                    className="min-h-[52px] items-center justify-center rounded-[15px] px-4 active:opacity-75"
                    style={{ backgroundColor: disabled ? colors.soft : colors.accent }}
                >
                    <Text className="text-center font-sans text-[14px] font-semibold text-ink">
                        {t("settings.addAlwaysActiveJob")}
                    </Text>
                </Pressable>
                <Pressable
                    testID="add-never-active-job"
                    accessibilityRole="button"
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => void addJob(false)}
                    className="min-h-[52px] items-center justify-center rounded-[15px] px-4 active:opacity-75"
                    style={{ backgroundColor: colors.soft, opacity: disabled ? 0.55 : 1 }}
                >
                    <Text className="text-center font-sans text-[14px] font-semibold text-ink">
                        {t("settings.addNeverActiveJob")}
                    </Text>
                </Pressable>
            </View>
            {addError ? (
                <Text accessibilityLiveRegion="polite" className="mt-3 px-1 font-sans text-[12.5px] leading-5 text-muted">
                    {t("settings.devJobError")}
                </Text>
            ) : null}
        </View>
    );
}
