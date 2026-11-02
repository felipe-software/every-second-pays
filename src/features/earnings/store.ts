import { create } from "zustand";

import { type Currency, isCurrency } from "@/features/currency/currencies";

import { deletePaymentSource, loadPaymentSources, writePaymentSource } from "./database";
import type { PaymentDraft, PaymentSource } from "./model";

// Drafts built from a saved source still carry its id and paidAt at runtime.
type CarriedDraft = PaymentDraft & Partial<Pick<PaymentSource, "id" | "paidAt">>;

function landed(source?: Pick<PaymentSource, "frequency" | "when">) {
    return source?.frequency === "once" && source.when === "today";
}

function resolvePaidAt(draft: PaymentDraft, previous: PaymentSource | undefined) {
    if (!landed(draft)) return undefined;
    return landed(previous) ? previous?.paidAt : Date.now();
}

type EarningsState = {
    sources: PaymentSource[];
    ready: boolean;
    loading: boolean;
    saving: boolean;
    loadError: boolean;
    load: () => Promise<void>;
    save: (draft: PaymentDraft, id?: number) => Promise<void>;
    remove: (id: number) => Promise<void>;
    adoptCurrency: (currency: Currency) => Promise<void>;
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
        if (draft.currency != null && !isCurrency(draft.currency)) throw new Error("Unknown currency.");
        const previous = id == null ? undefined : get().sources.find((source) => source.id === id);
        const paidAt = resolvePaidAt(draft, previous);
        const carried: CarriedDraft = draft;
        const { paidAt: _paidAt, id: _id, ...fields } = carried;
        set({ saving: true });
        try {
            const fieldsToWrite: Omit<PaymentSource, "id"> = {
                ...fields,
                name: draft.name.trim(),
                amount,
                days: [...draft.days],
                shifts: draft.shifts.map((shift) => ({ ...shift })),
            };
            if (paidAt != null) fieldsToWrite.paidAt = paidAt;
            const record = await writePaymentSource(fieldsToWrite, id);
            set(({ sources }) => ({
                sources:
                    id == null ? [...sources, record] : sources.map((source) => (source.id === id ? record : source)),
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
    adoptCurrency: async (currency) => {
        if (!get().ready || get().saving) throw new Error("Storage is busy.");
        const missing = get().sources.filter((source) => source.currency == null);
        if (!missing.length) return;
        set({ saving: true });
        try {
            for (const { id, ...source } of missing) {
                const record = await writePaymentSource({ ...source, currency }, id);
                set(({ sources }) => ({ sources: sources.map((item) => (item.id === id ? record : item)) }));
            }
        } finally {
            set({ saving: false });
        }
    },
}));
