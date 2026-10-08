import type { OnboardingAnimation } from "./skottie";

// Required on first use: they're large, and most launches never show the onboarding.
export const ONBOARDING_ART = {
    intro: () => require("@/assets/onboarding/intro.json") as OnboardingAnimation,
    widget: () => require("@/assets/onboarding/widget.json") as OnboardingAnimation,
    privacy: () => require("@/assets/onboarding/privacy.json") as OnboardingAnimation,
};
