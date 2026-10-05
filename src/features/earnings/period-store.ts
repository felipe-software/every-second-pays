import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

import { type EarningsPeriod, PERIODS } from "./model";

const STORAGE_KEY = "earnings-period";

function parsePeriod(value: unknown): EarningsPeriod {
    return PERIODS.find((period) => period === value) ?? "today";
}

type PeriodState = {
    period: EarningsPeriod;
    hydrated: boolean;
    load: () => Promise<void>;
    select: (period: EarningsPeriod) => void;
    /** Tapping wraps around: This year is followed by Today. */
    cycle: () => void;
    /** Swiping stops at Today and This year; returns whether the period changed. */
    step: (step: 1 | -1) => boolean;
};

/** The period the Earnings screen totals, remembered across launches. */
export const usePeriodStore = create<PeriodState>((set, get) => ({
    period: "today",
    hydrated: false,
    load: async () => {
        if (get().hydrated) return;
        try {
            set({ period: parsePeriod(await Storage.getItem(STORAGE_KEY)) });
        } catch {
            // Fall back to today; the choice is only a convenience.
        } finally {
            set({ hydrated: true });
        }
    },
    select: (period) => {
        if (period === get().period) return;
        set({ period });
        // Saving is best effort: the screen already shows the new period either way.
        Storage.setItem(STORAGE_KEY, period).catch(() => {});
    },
    cycle: () => {
        const { period, select } = get();
        select(PERIODS[(PERIODS.indexOf(period) + 1) % PERIODS.length]);
    },
    step: (step) => {
        const { period, select } = get();
        const next = PERIODS[PERIODS.indexOf(period) + step];
        if (!next) return false;
        select(next);
        return true;
    },
}));
