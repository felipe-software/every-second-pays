import { useState } from "react";

import type { IntroEvents } from "./intro-step";

export function useIntroProgress(reduced: boolean) {
    const [skipReady, setSkipReady] = useState(false);
    const [introDone, setIntroDone] = useState(false);
    const [flare, setFlare] = useState({ count: 0, big: false });
    const [introLifted, setIntroLifted] = useState(reduced);

    const introEvents: IntroEvents = {
        onSkipReady: () => setSkipReady(true),
        onImpact: (big) => setFlare((value) => ({ count: value.count + 1, big })),
        onLift: setIntroLifted,
        onReplay: () => setIntroDone(false),
        onDone: () => setIntroDone(true),
    };

    return { skipReady, introDone, flare, introLifted, introEvents };
}
