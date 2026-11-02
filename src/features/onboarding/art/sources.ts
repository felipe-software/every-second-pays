import type { Language } from "@/features/i18n/translations";

import type { OnboardingAnimation } from "./skottie";

type ArtLoader = () => OnboardingAnimation;

// Required on first use: they're large, and most launches never show the onboarding.
export const ONBOARDING_ART: Readonly<Record<"intro" | "widget" | "privacy" | "notifications", ArtLoader>> = {
    intro: () => require("@/assets/onboarding/intro.json"),
    widget: () => require("@/assets/onboarding/widget.json"),
    privacy: () => require("@/assets/onboarding/privacy.json"),
    notifications: () => require("@/assets/onboarding/notifications.json"),
};

// A trailing 2 is for locales where only five digits get a separator ("3520").
const INTRO_COUNTER: Readonly<Record<"comma" | "dot" | "dot2" | "space" | "space2", ArtLoader>> = {
    comma: () => require("@/assets/onboarding/intro-counter/comma.json"),
    dot: () => require("@/assets/onboarding/intro-counter/dot.json"),
    dot2: () => require("@/assets/onboarding/intro-counter/dot2.json"),
    space: () => require("@/assets/onboarding/intro-counter/space.json"),
    space2: () => require("@/assets/onboarding/intro-counter/space2.json"),
};

const INTRO_WORDS: Readonly<Record<Language, ArtLoader>> = {
    en: () => require("@/assets/onboarding/intro-words/en.json"),
    pt: () => require("@/assets/onboarding/intro-words/pt.json"),
    es: () => require("@/assets/onboarding/intro-words/es.json"),
    fr: () => require("@/assets/onboarding/intro-words/fr.json"),
};

function separatorStyle(separator: string) {
    if (separator === ",") return "comma";
    return separator === "." ? "dot" : "space";
}

export function introCounter(formatNumber: (value: number) => string) {
    const style = separatorStyle(formatNumber(42240).replace(/\d/g, ""));
    const fromFiveDigits = !/\D/.test(formatNumber(3520));
    const group: keyof typeof INTRO_COUNTER = style !== "comma" && fromFiveDigits ? `${style}2` : style;
    return INTRO_COUNTER[group]();
}

export function introWords(language: Language) {
    return INTRO_WORDS[language]();
}
