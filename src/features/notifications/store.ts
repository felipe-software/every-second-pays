import { create } from "zustand";

import { DEFAULT_SETTINGS, type NotificationSettings, pauseUntil, type PauseChoice } from "./routine";
import { readSettings, writeSettings } from "./storage";

type NotificationStoreState = {
    settings: NotificationSettings;
    hydrated: boolean;
    load: () => Promise<void>;
    change: (change: Partial<Pick<NotificationSettings, "week" | "progress" | "year" | "meter" | "showAmounts">>) => void;
    pause: (choice: PauseChoice) => void;
};

function persist(settings: NotificationSettings) {
    writeSettings(settings).catch(() => {});
}

export const useNotificationStore = create<NotificationStoreState>((set, get) => ({
    settings: DEFAULT_SETTINGS,
    hydrated: false,
    load: async () => {
        const settings = await readSettings();
        set({ settings, hydrated: true });
    },
    change: (change) => {
        const current = get().settings;
        const lessSteps = { ...current.lessSteps };
        for (const kind of ["week", "progress", "year", "meter"] as const) if (kind in change) lessSteps[kind] = 0;
        const settings = { ...current, ...change, lessSteps };
        set({ settings });
        persist(settings);
    },
    pause: (choice) => {
        const settings = { ...get().settings, pause: choice, pausedUntil: pauseUntil(choice, Date.now()) };
        set({ settings });
        persist(settings);
    },
}));
