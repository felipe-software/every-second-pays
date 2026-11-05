import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

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
