import { useEffect, useState } from "react";

import type { Look } from "./look";
import { CUSTOMIZE_PAGE } from "./onboarding-pages";

const ART_LOOK_SETTLE_MS = 600;

export function useArtLook(appLook: Look, step: number) {
    const [settled, setSettled] = useState(appLook);
    useEffect(() => {
        const timer = setTimeout(() => setSettled(appLook), ART_LOOK_SETTLE_MS);
        return () => clearTimeout(timer);
    }, [appLook]);
    return step === CUSTOMIZE_PAGE ? settled : appLook;
}
