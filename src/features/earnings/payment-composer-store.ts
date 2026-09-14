import { create } from "zustand";

type PaymentComposerState = {
    newSourceRequest: number;
    requestNewSource: () => void;
};

export const usePaymentComposerStore = create<PaymentComposerState>((set) => ({
    newSourceRequest: 0,
    requestNewSource: () => set((state) => ({ newSourceRequest: state.newSourceRequest + 1 })),
}));
