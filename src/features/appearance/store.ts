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

let writesInFlight = 0;
let writeQueue: Promise<unknown> = Promise.resolve();

function queueWrite(appearance: Appearance) {
    const write =
        writesInFlight === 0
            ? writeAppearancePreference(appearance)
            : writeQueue.then(() => writeAppearancePreference(appearance));
    writesInFlight += 1;
    writeQueue = write.catch(() => undefined);
    return write;
}

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
    appearance: DEFAULT_APPEARANCE,
    ...INITIAL_LOAD_FLAGS,
    load: () => loadOnce(get, set, loadAppearancePreference, (appearance) => set({ appearance })),
    update: async (change) => {
        if (!get().hydrated || get().loading || get().loadError) throw new Error("Preferences unavailable.");
        const previousAppearance = get().appearance;
        const appearance = parseAppearance({ ...previousAppearance, ...change });
        if (appearance.mode === previousAppearance.mode && appearance.palette === previousAppearance.palette) return;

        // Apply before persisting so the control and theme update in one frame, with no disabled flash.
        set({ appearance, saving: true });
        try {
            await queueWrite(appearance);
        } catch (error) {
            if (get().appearance === appearance) set({ appearance: previousAppearance });
            throw error;
        } finally {
            writesInFlight -= 1;
            if (writesInFlight === 0) set({ saving: false });
        }
    },
}));
