import { css, Easing, linear } from "react-native-reanimated";

/** The design artboard every onboarding coordinate is measured in (a Pixel 8 screen). */
export const ARTBOARD = { width: 412, height: 915 } as const;

// Spring curves sampled into CSS `linear()` easings, as in the design, so CSS animations
// overshoot and settle like springs without running a physics solver per view.
export const EASE_BOUNCY = linear(0, 0.026, 0.095, 0.195, 0.316, 0.448, 0.581, 0.709, 0.827, 0.93, 1.016, 1.085, 1.137, 1.171, 1.19, 1.196, 1.192, 1.178, 1.158, 1.135, 1.109, 1.083, 1.058, 1.034, 1.014, 0.997, 0.983, 0.973, 0.966, 0.963, 0.961, 0.962, 0.965, 0.969, 0.973, 0.979, 0.984, 0.989, 0.993, 0.997, 1.001, 1.003, 1.005, 1.007, 1.007, 1.008, 1.007, 1.007, 1.006, 1.005, 1.004, 1.003, 1.002, 1.001, 1.001, 1, 0.999, 0.999, 0.999, 0.999, 1);
export const EASE_SPRING = linear(0, 0.019, 0.068, 0.141, 0.228, 0.323, 0.422, 0.519, 0.612, 0.699, 0.777, 0.846, 0.905, 0.955, 0.995, 1.026, 1.05, 1.066, 1.077, 1.082, 1.083, 1.082, 1.077, 1.071, 1.063, 1.055, 1.047, 1.039, 1.031, 1.024, 1.018, 1.012, 1.007, 1.003, 1, 0.997, 0.996, 0.994, 0.993, 0.993, 0.993, 0.993, 0.994, 0.994, 0.995, 0.995, 0.996, 0.997, 0.997, 0.998, 0.999, 0.999, 1);
export const EASE_SOFT = linear(0, 0.017, 0.06, 0.122, 0.194, 0.272, 0.351, 0.43, 0.504, 0.574, 0.638, 0.696, 0.747, 0.792, 0.831, 0.865, 0.894, 0.918, 0.938, 0.954, 0.968, 0.978, 0.987, 0.993, 0.998, 1.002, 1.004, 1.006, 1.007, 1.008, 1.008, 1.008, 1.007, 1.007, 1.006, 1.006, 1.005, 1.004, 1.004, 1.003, 1);

/** `EASE_SOFT` for worklet timings (the pager), which take an easing function. */
export const EASE_SOFT_FN = Easing.bezierFn(0.22, 1, 0.36, 1);

export const FADE_IN = css.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

/** Content rising into place as a page arrives; `distance` and `scale` match the design's `--rise`/`--rs`. */
const riseRules = new Map<string, ReturnType<typeof css.keyframes>>();
export function riseKeyframes(distance: number, scale = 1) {
    const key = `${distance}:${scale}`;
    let rule = riseRules.get(key);
    if (!rule) {
        rule = css.keyframes({
            from: { transform: [{ translateY: distance }, { scale }] },
            to: { transform: [{ translateY: 0 }, { scale: 1 }] },
        });
        riseRules.set(key, rule);
    }
    return rule;
}

export function rise(delay: number, distance = 26, scale = 1) {
    return {
        animationName: [riseKeyframes(distance, scale), FADE_IN],
        animationDuration: [950, 480],
        animationTimingFunction: [EASE_SPRING, "ease-out" as const],
        animationDelay: delay,
        animationFillMode: "both" as const,
    };
}

const WORD_MOVE = css.keyframes({
    from: { transform: [{ translateY: 20 }, { rotate: "2.5deg" }] },
    to: { transform: [{ translateY: 0 }, { rotate: "0deg" }] },
});

/** A title word tipping up into place. */
export function wordIn(delay: number) {
    return {
        animationName: [WORD_MOVE, FADE_IN],
        animationDuration: [1000, 520],
        animationTimingFunction: [EASE_SPRING, "ease-out" as const],
        animationDelay: delay,
        animationFillMode: "both" as const,
    };
}
