import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

import type { Language } from "./translations";

export type LanguagePreference = "system" | Language;

const STORAGE_KEY = "language";

function parsePreference(value: unknown): LanguagePreference {
    return value === "en" || value === "pt" || value === "es" || value === "fr" ? value : "system";
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
    hydrated: false,
    loading: false,
    saving: false,
    loadError: false,
    load: async () => {
        if (get().loading || (get().hydrated && !get().loadError)) return;
        set({ loading: true, loadError: false });
        try {
            set({ preference: parsePreference(await Storage.getItem(STORAGE_KEY)) });
        } catch {
            set({ loadError: true });
        } finally {
            set({ hydrated: true, loading: false });
        }
    },
    update: async (preference) => {
        if (!get().hydrated || get().loading || get().loadError || get().saving) {
            throw new Error("Language preference unavailable.");
        }
        set({ saving: true });
        try {
            await Storage.setItem(STORAGE_KEY, preference);
            set({ preference });
        } finally {
            set({ saving: false });
        }
    },
}));
