import { Alert } from "react-native";

import type { TranslationKey } from "@/features/i18n/translations";

import { earnedToday, type PaymentDraft } from "./model";
import { useEarningsStore } from "./store";

type PaymentSourceActionsOptions = {
    onCelebrate: (sourceId: number) => void;
    remove: (id: number) => Promise<void>;
    save: (draft: PaymentDraft, id?: number) => Promise<void>;
    t: (key: TranslationKey) => string;
};

export function paymentSourceActions({ onCelebrate, remove, save, t }: PaymentSourceActionsOptions) {
    const saveSource = async (draft: PaymentDraft, id?: number) => {
        if (useEarningsStore.getState().saving) return;
        try {
            const isFirstJob = useEarningsStore.getState().sources.length === 0;
            await save(draft, id);
            const created = id == null ? useEarningsStore.getState().sources.at(-1) : undefined;
            if (created && (isFirstJob || earnedToday(created, new Date()) === 0)) {
                onCelebrate(created.id);
            }
        } catch {
            Alert.alert(t("home.saveErrorTitle"), t("home.saveErrorBody"));
            throw new Error("Could not save payment source");
        }
    };

    const removeSource = async (id: number) => {
        if (useEarningsStore.getState().saving) return;
        try {
            await remove(id);
        } catch {
            Alert.alert(t("home.deleteErrorTitle"), t("home.deleteErrorBody"));
            throw new Error("Could not delete payment source");
        }
    };

    return { saveSource, removeSource };
}
