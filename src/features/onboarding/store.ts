import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

import { loadPaymentSources } from "../earnings/database";

const STORAGE_KEY = "onboarding";
const COMPLETED = "done";

type OnboardingState = {
    status: "unknown" | "pending" | "done";
    covering: boolean;
    load: () => Promise<void>;
    uncover: () => void;
    complete: () => void;
    replay: () => void;
};

async function hasSavedSources() {
    try {
        return (await loadPaymentSources()).length > 0;
    } catch {
        return false;
    }
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
    status: "unknown",
    covering: false,
    load: async () => {
        if (get().status !== "unknown") return;
        try {
            if ((await Storage.getItem(STORAGE_KEY)) === COMPLETED) {
                set({ status: "done" });
                return;
            }
            // People who added sources before the onboarding existed have already started.
            if (await hasSavedSources()) {
                set({ status: "done" });
                void Storage.setItem(STORAGE_KEY, COMPLETED).catch(() => undefined);
                return;
            }
            set({ status: "pending", covering: true });
        } catch {
            // A storage failure shouldn't keep anyone out of the app.
            set({ status: "done" });
        }
    },
    uncover: () => set({ covering: false }),
    complete: () => {
        set({ status: "done", covering: false });
        void Storage.setItem(STORAGE_KEY, COMPLETED).catch(() => undefined);
    },
    replay: () => set({ status: "pending", covering: true }),
}));
