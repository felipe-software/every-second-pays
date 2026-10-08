import { Skia, type SkSkottieAnimation } from "@shopify/react-native-skia";

import type { PaletteId } from "@/features/appearance/palettes";

/**
 * One onboarding animation as `scripts/onboarding-lottie` exports it: a Lottie template in which
 * every value that depends on the look is a `"#n"` token and every text variant's visibility is
 * an `"@key=value"` marker.
 */
export type OnboardingAnimation = {
    animation: unknown;
    /** `tokens[n][look]`: token n's value in each look, ordered as `looks`. */
    tokens: unknown[][];
    /** `"<palette>-<dark|light>"`. */
    looks: string[];
    /** The variant values the template was captured in, e.g. `{ lang: "en" }`. */
    variants: Record<string, string>;
    /** Named spans of the timeline, in frames. */
    segments: Record<string, [number, number]>;
    /** Moments in the timeline worth acting on (an impact for a haptic), in frames. */
    cues: Cue[];
};

export type Cue = { frame: number; name: string };

export type AnimationLook = { palette: PaletteId; dark: boolean };
export type AnimationVariants = Record<string, string>;

const TOKEN = /"#(\d+)"/g;
// "@lang=es" shows only in Spanish; "@lang!=es|pt" everywhere else.
const MARKER = /"@([a-z]+)(!?=)([^"]*)"/g;

const templates = new WeakMap<OnboardingAnimation, string>();
const built = new Map<string, SkSkottieAnimation>();
const names = new WeakMap<OnboardingAnimation, string>();
let nextName = 0;

/** Keeps the most recently used looks; each holds a whole scene graph. */
const CACHE_SIZE = 6;

function templateOf(source: OnboardingAnimation) {
    let template = templates.get(source);
    if (!template) {
        template = JSON.stringify(source.animation);
        templates.set(source, template);
    }
    return template;
}

/** The animation in one look and one set of text variants, ready to draw. */
export function onboardingSkottie(source: OnboardingAnimation, look: AnimationLook, variants: AnimationVariants = {}) {
    let name = names.get(source);
    if (!name) {
        name = String(nextName++);
        names.set(source, name);
    }
    const lookId = `${look.palette}-${look.dark ? "dark" : "light"}`;
    const chosen = { ...source.variants, ...variants };
    const key = `${name}|${lookId}|${Object.entries(chosen).sort().join(",")}`;
    const cached = built.get(key);
    if (cached) {
        built.delete(key);
        built.set(key, cached);
        return cached;
    }

    const index = Math.max(0, source.looks.indexOf(lookId));
    const json = templateOf(source)
        .replace(TOKEN, (_, token: string) => JSON.stringify(source.tokens[Number(token)][index]))
        .replace(MARKER, (_, variant: string, op: string, value: string) => {
            const shown = op === "=" ? chosen[variant] === value : !value.split("|").includes(chosen[variant]);
            return shown ? "100" : "0";
        });
    const animation = Skia.Skottie.Make(json);
    built.set(key, animation);
    if (built.size > CACHE_SIZE) built.delete(built.keys().next().value!);
    return animation;
}
