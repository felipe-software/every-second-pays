import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

const STORAGE_KEY = "developer-menu";
export const UNLOCK_TAPS = 20;
export const TAP_STREAK_GAP_MS = 1000;

type DeveloperState = {
    unlocked: boolean;
    hydrated: boolean;
    streak: number;
    lastTapAt: number;
    load: () => Promise<void>;
    tap: (now?: number) => boolean;
};

export const useDeveloperStore = create<DeveloperState>((set, get) => ({
    unlocked: false,
    hydrated: false,
    streak: 0,
    lastTapAt: 0,
    load: async () => {
        if (get().hydrated) return;
        try {
            set({ unlocked: (await Storage.getItem(STORAGE_KEY)) === "on" });
        } catch {
        } finally {
            set({ hydrated: true });
        }
    },
    tap: (now = Date.now()) => {
        const { streak, lastTapAt, unlocked, hydrated } = get();
        if (!hydrated) return false;
        const next = now - lastTapAt <= TAP_STREAK_GAP_MS ? streak + 1 : 1;
        if (next < UNLOCK_TAPS) {
            set({ streak: next, lastTapAt: now });
            return false;
        }
        set({ streak: 0, lastTapAt: 0, unlocked: !unlocked });
        Storage.setItem(STORAGE_KEY, unlocked ? "off" : "on").catch(() => {});
        return true;
    },
}));

export function useDeveloperMenuVisible() {
    const unlocked = useDeveloperStore((state) => state.unlocked);
    return __DEV__ || unlocked;
}
