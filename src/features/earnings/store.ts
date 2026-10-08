import { create } from "zustand";

import { deletePaymentSource, loadPaymentSources, writePaymentSource } from "./database";
import type { PaymentDraft, PaymentSource } from "./model";

type EarningsState = {
    sources: PaymentSource[];
    ready: boolean;
    loading: boolean;
    saving: boolean;
    loadError: boolean;
    load: () => Promise<void>;
    save: (draft: PaymentDraft, id?: number) => Promise<void>;
    remove: (id: number) => Promise<void>;
};

export const useEarningsStore = create<EarningsState>((set, get) => ({
    sources: [],
    ready: false,
    loading: false,
    saving: false,
    loadError: false,
    load: async () => {
        if (get().loading || get().ready) return;
        set({ loading: true, loadError: false });
        try {
            set({ sources: await loadPaymentSources(), ready: true });
        } catch {
            set({ loadError: true });
        } finally {
            set({ loading: false });
        }
    },
    save: async (draft, id) => {
        if (!get().ready || get().saving) throw new Error("Storage is busy.");
        const amount = Number(draft.amount);
        if (!draft.name.trim() || !Number.isFinite(amount) || amount <= 0) {
            throw new Error("Enter a name and a positive amount.");
        }
        const previous = id == null ? undefined : get().sources.find((source) => source.id === id);
        const landed = (source?: Pick<PaymentSource, "frequency" | "when">) => source?.frequency === "once" && source.when === "today";
        const paidAt = landed(draft) ? (landed(previous) ? previous?.paidAt : Date.now()) : undefined;
        // Drafts built from a saved source still carry its id and paidAt at runtime.
        const { paidAt: _paidAt, id: _id, ...fields } = draft as PaymentDraft & Partial<Pick<PaymentSource, "id" | "paidAt">>;
        set({ saving: true });
        try {
            const record = await writePaymentSource({
                ...fields,
                ...(paidAt == null ? {} : { paidAt }),
                name: draft.name.trim(),
                amount,
                days: [...draft.days],
                shifts: draft.shifts.map((shift) => ({ ...shift })),
            }, id);
            set(({ sources }) => ({
                sources: id == null ? [...sources, record] : sources.map((source) => source.id === id ? record : source),
            }));
        } finally {
            set({ saving: false });
        }
    },
    remove: async (id) => {
        if (!get().ready || get().saving) throw new Error("Storage is busy.");
        set({ saving: true });
        try {
            await deletePaymentSource(id);
            set(({ sources }) => ({ sources: sources.filter((source) => source.id !== id) }));
        } finally {
            set({ saving: false });
        }
    },
}));
