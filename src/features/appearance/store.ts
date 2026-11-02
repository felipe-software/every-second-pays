import { create } from "zustand";
import { loadAppearancePreference, writeAppearancePreference } from "../earnings/database";
import { DEFAULT_APPEARANCE, parseAppearance, type Appearance } from "./palettes";

type AppearanceState = {
    appearance: Appearance;
    hydrated: boolean;
    loading: boolean;
    saving: boolean;
    loadError: boolean;
    load: () => Promise<void>;
    update: (change: Partial<Appearance>) => Promise<void>;
};

let writesInFlight = 0;
let writeQueue: Promise<unknown> = Promise.resolve();

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
    appearance: DEFAULT_APPEARANCE, hydrated: false, loading: false, saving: false, loadError: false,
    load: async () => {
        if (get().loading || (get().hydrated && !get().loadError)) return;
        set({ loading: true, loadError: false });
        try {
            set({ appearance: parseAppearance(await loadAppearancePreference()) });
        } catch {
            set({ loadError: true });
        } finally {
            set({ loading: false, hydrated: true });
        }
    },
    update: async (change) => {
        if (!get().hydrated || get().loading || get().loadError) throw new Error("Preferences unavailable");
        const previousAppearance = get().appearance;
        const appearance = parseAppearance({ ...previousAppearance, ...change });
        if (appearance.mode === previousAppearance.mode && appearance.palette === previousAppearance.palette) return;

        // Apply before persisting so the control and theme update in one frame instead of flashing a disabled state.
        set({ appearance, saving: true });
        const write = writesInFlight === 0
            ? writeAppearancePreference(appearance)
            : writeQueue.then(() => writeAppearancePreference(appearance));
        writesInFlight += 1;
        writeQueue = write.catch(() => undefined);
        try {
            await write;
        } catch (error) {
            if (get().appearance === appearance) set({ appearance: previousAppearance });
            throw error;
        } finally {
            writesInFlight -= 1;
            if (writesInFlight === 0) set({ saving: false });
        }
    },
}));
