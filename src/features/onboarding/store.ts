import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

import { useEarningsStore } from "../earnings/store";

const STORAGE_KEY = "onboarding-complete";

type OnboardingState = {
    complete: boolean;
    hydrated: boolean;
    load: () => Promise<void>;
    finish: () => void;
    /** Developer setting: plays the onboarding again on top of the app. */
    replay: () => void;
};

/** Whether the first-launch walkthrough has been seen, remembered across launches. */
export const useOnboardingStore = create<OnboardingState>((set, get) => ({
    complete: false,
    hydrated: false,
    load: async () => {
        if (get().hydrated) return;
        try {
            if (await Storage.getItem(STORAGE_KEY)) {
                set({ complete: true });
                return;
            }
            // People who set up a source before onboarding existed already know the app.
            const earnings = useEarningsStore.getState();
            await earnings.load();
            if (useEarningsStore.getState().sources.length > 0) get().finish();
        } catch {
            // Showing the walkthrough again is harmless; never block launch on it.
        } finally {
            set({ hydrated: true });
        }
    },
    finish: () => {
        set({ complete: true });
        Storage.setItem(STORAGE_KEY, "1").catch(() => {});
    },
    replay: () => set({ complete: false }),
}));
