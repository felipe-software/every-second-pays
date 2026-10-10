import type { Language } from "@/features/i18n/translations";

import type { OnboardingAnimation } from "./skottie";

// Required on first use: they're large, and most launches never show the onboarding.
export const ONBOARDING_ART = {
    intro: () => require("@/assets/onboarding/intro.json") as OnboardingAnimation,
    widget: () => require("@/assets/onboarding/widget.json") as OnboardingAnimation,
    privacy: () => require("@/assets/onboarding/privacy.json") as OnboardingAnimation,
};

/**
 * The intro's total, drawn over its art on the same timeline, once per way of grouping
 * thousands: the separator, and a trailing 2 where only five digits get one ("3520").
 */
const INTRO_COUNTER = {
    comma: () => require("@/assets/onboarding/intro-counter/comma.json") as OnboardingAnimation,
    dot: () => require("@/assets/onboarding/intro-counter/dot.json") as OnboardingAnimation,
    dot2: () => require("@/assets/onboarding/intro-counter/dot2.json") as OnboardingAnimation,
    space: () => require("@/assets/onboarding/intro-counter/space.json") as OnboardingAnimation,
    space2: () => require("@/assets/onboarding/intro-counter/space2.json") as OnboardingAnimation,
};

/** The period the intro's total adds up over, spelled in each language. */
const INTRO_WORDS: Record<Language, () => OnboardingAnimation> = {
    en: () => require("@/assets/onboarding/intro-words/en.json") as OnboardingAnimation,
    pt: () => require("@/assets/onboarding/intro-words/pt.json") as OnboardingAnimation,
    es: () => require("@/assets/onboarding/intro-words/es.json") as OnboardingAnimation,
    fr: () => require("@/assets/onboarding/intro-words/fr.json") as OnboardingAnimation,
};

/** The intro counter in the reader's number format: how it writes 3520 and 42240. */
export function introCounter(formatNumber: (value: number) => string) {
    const separator = formatNumber(42240).replace(/\d/g, "");
    const style = separator === "," ? "comma" : separator === "." ? "dot" : "space";
    const fromFiveDigits = !/\D/.test(formatNumber(3520));
    const group: keyof typeof INTRO_COUNTER = style !== "comma" && fromFiveDigits ? `${style}2` : style;
    return INTRO_COUNTER[group]();
}

export function introWords(language: Language) {
    return INTRO_WORDS[language]();
}
