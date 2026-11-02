import { create } from "zustand";
import { loadAppearancePreference, writeAppearancePreference } from "../earnings/database";
import { DEFAULT_APPEARANCE, parseAppearance, type Appearance } from "./palettes";
import { INITIAL_LOAD_FLAGS, loadOnce } from "./preference-load";

type AppearanceState = {
    appearance: Appearance;
    hydrated: boolean;
    loading: boolean;
    saving: boolean;
    loadError: boolean;
    load: () => Promise<void>;
    update: (change: Partial<Appearance>) => Promise<void>;
};

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
    appearance: DEFAULT_APPEARANCE,
    ...INITIAL_LOAD_FLAGS,
    load: () => loadOnce(get, set, loadAppearancePreference, (appearance) => set({ appearance })),
    update: async (change) => {
        if (!get().hydrated || get().loading || get().loadError || get().saving)
            throw new Error("Preferences unavailable.");
        const previousAppearance = get().appearance;
        const appearance = parseAppearance({ ...get().appearance, ...change });
        if (appearance.mode === previousAppearance.mode && appearance.palette === previousAppearance.palette) return;

        // Apply before persisting so the control and theme update in one frame, with no disabled flash.
        set({ appearance, saving: true });
        try {
            await writeAppearancePreference(appearance);
        } catch (error) {
            set({ appearance: previousAppearance });
            throw error;
        } finally {
            set({ saving: false });
        }
    },
}));
