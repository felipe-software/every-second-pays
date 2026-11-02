import { useState } from "react";

import { useOnboardingStore } from "./store";

export const REVEAL_DELAY = 380;
export const REVEAL_DURATION = 420;

export function useOnboardingExit() {
    const complete = useOnboardingStore((state) => state.complete);
    const uncover = useOnboardingStore((state) => state.uncover);
    const reveal = useOnboardingStore((state) => state.reveal);
    const [exiting, setExiting] = useState(false);

    const exit = () => {
        if (exiting) return;
        setExiting(true);
        reveal();
        uncover();
        setTimeout(complete, REVEAL_DELAY + REVEAL_DURATION);
    };

    return { exiting, exit, reveal };
}
