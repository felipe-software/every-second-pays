import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

import { loadPaymentSources } from "../earnings/database";

const STORAGE_KEY = "onboarding";
const COMPLETED = "done";

type OnboardingState = {
    /** `unknown` until loaded; the app waits on it so the first frame is the right one. */
    status: "unknown" | "pending" | "done";
    // The app underneath isn't drawn while the onboarding covers all of it.
    covering: boolean;
    // The app's own entrance (its first-source hint) waits for the intro to end, or for an early exit.
    revealed: boolean;
    load: () => Promise<void>;
    reveal: () => void;
    uncover: () => void;
    complete: () => void;
    /** Shows the onboarding again; for the developer controls. */
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
    revealed: false,
    load: async () => {
        if (get().status !== "unknown") return;
        try {
            if (await Storage.getItem(STORAGE_KEY) === COMPLETED) {
                set({ status: "done", revealed: true });
                return;
            }
            // People who added sources before the onboarding existed have already started.
            if (await hasSavedSources()) {
                set({ status: "done", revealed: true });
                void Storage.setItem(STORAGE_KEY, COMPLETED).catch(() => undefined);
                return;
            }
            set({ status: "pending", covering: true });
        } catch {
            // A storage failure shouldn't keep anyone out of the app.
            set({ status: "done", revealed: true });
        }
    },
    reveal: () => set({ revealed: true }),
    uncover: () => set({ covering: false }),
    complete: () => {
        set({ status: "done", covering: false, revealed: true });
        void Storage.setItem(STORAGE_KEY, COMPLETED).catch(() => undefined);
    },
    replay: () => set({ status: "pending", covering: true }),
}));
