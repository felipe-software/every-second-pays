import { useState } from "react";
import { Text, View } from "react-native";

import { ElevatedPressable } from "@/components/elevated/elevated-pressable";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import type { PaymentDraft, PaymentSource } from "./model";
import { useEarningsStore } from "./store";
import { edgeColor, useEarningsTheme } from "./theme";

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
        amount: "100000",
        frequency: "month",
        when: "today",
        days: active ? [...ALL_DAYS] : [],
        shifts: FULL_DAY.map((shift) => ({ ...shift })),
    };
}

export function DevJobControls() {
    const { colors, isDark } = useEarningsTheme();
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
                <ElevatedPressable
                    testID="add-always-active-job"
                    accessibilityRole="button"
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => void addJob(true)}
                    face={disabled ? colors.canvas : colors.accent}
                    edge={disabled ? "transparent" : edgeColor(colors.accent, { accent: true })}
                    depth={4}
                    radius={15}
                    className="min-h-[52px] items-center justify-center px-4"
                >
                    <Text className="text-center font-sans text-[14px] font-semibold text-ink">
                        {t("settings.addAlwaysActiveJob")}
                    </Text>
                </ElevatedPressable>
                <ElevatedPressable
                    testID="add-never-active-job"
                    accessibilityRole="button"
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => void addJob(false)}
                    face={colors.canvas}
                    edge={disabled ? "transparent" : edgeColor(colors.canvas, { isDark })}
                    depth={4}
                    radius={15}
                    className="min-h-[52px] items-center justify-center px-4"
                    style={{ opacity: disabled ? 0.55 : 1 }}
                >
                    <Text className="text-center font-sans text-[14px] font-semibold text-ink">
                        {t("settings.addNeverActiveJob")}
                    </Text>
                </ElevatedPressable>
            </View>
            {addError ? (
                <Text accessibilityLiveRegion="polite" className="mt-3 px-1 font-sans text-[12.5px] leading-5 text-muted">
                    {t("settings.devJobError")}
                </Text>
            ) : null}
        </View>
    );
}
