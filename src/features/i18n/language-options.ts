import type { ThemeTransitionOrigin } from "@/features/appearance/theme-transition";

import type { LanguagePreference } from "./store";

export const LANGUAGE_OPTIONS = [
    { value: "system", label: null, flag: null },
    { value: "en", label: "English", flag: require("../../assets/flags/us.png") },
    { value: "pt", label: "Português", flag: require("../../assets/flags/br.png") },
    { value: "es", label: "Español", flag: require("../../assets/flags/es.png") },
    { value: "fr", label: "Français", flag: require("../../assets/flags/fr.png") },
] as const;

export type LanguageMenuProps = {
    preference: LanguagePreference;
    disabled: boolean;
    onOpen: () => void;
    onChange: (value: LanguagePreference, origin?: ThemeTransitionOrigin) => void;
};
