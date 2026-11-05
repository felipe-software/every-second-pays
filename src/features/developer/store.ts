import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

const STORAGE_KEY = "developer-menu";
const LOW_END_KEY = "developer-force-low-end";
export const UNLOCK_TAPS = 20;
export const TAP_STREAK_GAP_MS = 1000;

type DeveloperState = {
    unlocked: boolean;
    forceLowEnd: boolean;
    hydrated: boolean;
    streak: number;
    lastTapAt: number;
    load: () => Promise<void>;
    tap: (now?: number) => boolean;
    toggleForceLowEnd: () => void;
};

export const useDeveloperStore = create<DeveloperState>((set, get) => ({
    unlocked: false,
    forceLowEnd: false,
    hydrated: false,
    streak: 0,
    lastTapAt: 0,
    load: async () => {
        if (get().hydrated) return;
        try {
            const [unlocked, forceLowEnd] = await Promise.all([
                Storage.getItem(STORAGE_KEY),
                Storage.getItem(LOW_END_KEY),
            ]);
            set({ unlocked: unlocked === "on", forceLowEnd: forceLowEnd === "on" });
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
    toggleForceLowEnd: () => {
        const forceLowEnd = !get().forceLowEnd;
        set({ forceLowEnd });
        Storage.setItem(LOW_END_KEY, forceLowEnd ? "on" : "off").catch(() => {});
    },
}));

export function useDeveloperMenuVisible() {
    const unlocked = useDeveloperStore((state) => state.unlocked);
    return __DEV__ || unlocked;
}
