import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

import { loadPaymentSources } from "../earnings/database";

const STORAGE_KEY = "onboarding";
const COMPLETED = "done";

type OnboardingState = {
    /** `unknown` until loaded; the app waits on it so the first frame is the right one. */
    status: "unknown" | "pending" | "done";
    /**
     * Whether the app is mounted under the onboarding. It waits for the intro animation to
     * finish so it doesn't compete with it, and stays mounted once shown.
     */
    revealed: boolean;
    load: () => Promise<void>;
    reveal: () => void;
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
            set({ status: "pending" });
        } catch {
            // A storage failure shouldn't keep anyone out of the app.
            set({ status: "done", revealed: true });
        }
    },
    reveal: () => set({ revealed: true }),
    complete: () => {
        set({ status: "done", revealed: true });
        void Storage.setItem(STORAGE_KEY, COMPLETED).catch(() => undefined);
    },
    replay: () => set({ status: "pending" }),
}));
