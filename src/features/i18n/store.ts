import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

import { INITIAL_LOAD_FLAGS, loadOnce } from "@/features/appearance/preference-load";

import type { Language } from "./translations";

export type LanguagePreference = "system" | Language;

const STORAGE_KEY = "language";

function parsePreference(value: unknown): LanguagePreference {
    return value === "en" || value === "pt" || value === "es" || value === "fr" ? value : "system";
}

export async function readLanguagePreference() {
    return parsePreference(await Storage.getItem(STORAGE_KEY));
}

type LanguageState = {
    preference: LanguagePreference;
    hydrated: boolean;
    loading: boolean;
    saving: boolean;
    loadError: boolean;
    load: () => Promise<void>;
    update: (preference: LanguagePreference) => Promise<void>;
};

export const useLanguageStore = create<LanguageState>((set, get) => ({
    preference: "system",
    ...INITIAL_LOAD_FLAGS,
    load: () =>
        loadOnce(
            get,
            set,
            () => Storage.getItem(STORAGE_KEY),
            (stored) => set({ preference: parsePreference(stored) }),
        ),
    update: async (preference) => {
        if (!get().hydrated || get().loading || get().loadError || get().saving) {
            throw new Error("Language preference unavailable.");
        }
        const previousPreference = get().preference;
        if (preference === previousPreference) return;

        set({ preference, saving: true });
        try {
            await Storage.setItem(STORAGE_KEY, preference);
        } catch (error) {
            set({ preference: previousPreference });
            throw error;
        } finally {
            set({ saving: false });
        }
    },
}));
