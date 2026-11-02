import { colorPattern, finite, rem } from "./scene-values";
import type { RuntimeAnimationState, RuntimeTransition, SerializedRuntimeFrame } from "./types";

function channel(value: number): string {
    return Math.round(Math.max(0, Math.min(255, value)))
        .toString(16)
        .padStart(2, "0");
}

function expandColor(value: string): string {
    return value.length === 7 ? `${value}ff` : value;
}

function interpolateColor(from: string, to: string, progress: number): string {
    if (!colorPattern.test(from) || !colorPattern.test(to))
        throw new Error("Runtime animation colors must use #RRGGBB or #RRGGBBAA.");
    const left = expandColor(from);
    const right = expandColor(to);
    return `#${[1, 3, 5, 7]
        .map((offset) => {
            const start = parseInt(left.slice(offset, offset + 2), 16);
            const end = parseInt(right.slice(offset, offset + 2), 16);
            return channel(start + (end - start) * progress);
        })
        .join("")}`;
}

function cubic(value: number, a: number, b: number): number {
    const inverse = 1 - value;
    return 3 * inverse * inverse * value * a + 3 * inverse * value * value * b + value ** 3;
}

function bezierProgress(progress: number, points: [number, number, number, number]): number {
    let low = 0;
    let high = 1;
    for (let iteration = 0; iteration < 14; iteration += 1) {
        const guess = (low + high) / 2;
        if (cubic(guess, points[0], points[2]) < progress) low = guess;
        else high = guess;
    }
    return cubic((low + high) / 2, points[1], points[3]);
}

function timingProgress(progress: number, easing: RuntimeTransition["easing"]): number {
    if (progress === 0 || progress === 1) return progress;
    if (Array.isArray(easing)) {
        easing.forEach((value, index) =>
            finite(value, "Bézier control point", index % 2 === 0 ? 0 : -10, index % 2 === 0 ? 1 : 10),
        );
        return bezierProgress(progress, easing);
    }
    if (easing === "linear") return progress;
    if (easing === "easeIn") return progress * progress;
    if (easing === "easeOut") return 1 - (1 - progress) ** 2;
    return progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
}

function springProgress(progress: number, transition: RuntimeTransition): number {
    const damping = finite(transition.damping ?? 12, "damping", 0.1, 100);
    const stiffness = finite(transition.stiffness ?? 120, "stiffness", 1, 1000);
    const mass = finite(transition.mass ?? 1, "mass", 0.1, 20);
    const duration = transition.duration ?? 1200;
    const seconds = progress * (duration / 1000);
    const decay = Math.exp((-damping * seconds) / (2 * mass));
    const frequency = Math.sqrt(stiffness / mass);
    const raw = 1 - decay * Math.cos(frequency * seconds);
    const finalSeconds = duration / 1000;
    const final = 1 - Math.exp((-damping * finalSeconds) / (2 * mass)) * Math.cos(frequency * finalSeconds);
    return final === 0 ? progress : raw / final;
}

function runtimeValue(name: string, value: unknown): string | number {
    if (name === "translateX" || name === "translateY") return rem(value, name);
    if (name === "opacity") return finite(value, name, 0, 1);
    if (name === "rotate") return finite(value, name, -36000, 36000);
    if (name === "scaleX" || name === "scaleY") return finite(value, name, 0, 100);
    if (name !== "backgroundColor") throw new Error(`Unsupported runtime animation property: ${name}`);
    if (typeof value !== "string" || !colorPattern.test(value))
        throw new Error("Runtime animation colors must use #RRGGBB or #RRGGBBAA.");
    return value;
}

function runtimeState(input: RuntimeAnimationState): SerializedRuntimeFrame {
    const output: SerializedRuntimeFrame = {};
    if (input.scale !== undefined) {
        const scale = finite(input.scale, "scale", 0, 100);
        output.scaleX = scale;
        output.scaleY = scale;
    }
    for (const [name, value] of Object.entries(input)) {
        if (name !== "scale") output[name] = runtimeValue(name, value);
    }
    return output;
}

export function compileRuntimeFrames(
    fromInput: RuntimeAnimationState,
    animateInput: RuntimeAnimationState | RuntimeAnimationState[],
    transition: RuntimeTransition = {},
) {
    const targets = Array.isArray(animateInput) ? animateInput : [animateInput];
    if (targets.length < 1 || targets.length > 8) throw new Error("animate must contain 1–8 runtime states.");
    const states = [runtimeState(fromInput), ...targets.map(runtimeState)];
    const duration = finite(transition.duration ?? (transition.type === "spring" ? 1200 : 800), "duration", 100, 30000);
    const frameDuration = transition.repeatReverse ? 66 : 33;
    const automaticFrameCount = Math.min(48, Math.max(2, Math.round(duration / frameDuration) + 1));
    const frameCount = finite(transition.frames ?? automaticFrameCount, "frames", 2, 48);
    if (!Number.isInteger(frameCount)) throw new Error("frames must be an integer.");
    const keys = new Set(states.flatMap((state) => Object.keys(state)));
    const resolved: SerializedRuntimeFrame[] = [];
    states.forEach((state, stateIndex) => {
        const output: SerializedRuntimeFrame = {};
        for (const key of keys) {
            const previous = stateIndex === 0 ? undefined : resolved[stateIndex - 1][key];
            const future = states.slice(stateIndex).find((candidate) => candidate[key] !== undefined)?.[key];
            output[key] = state[key] ?? previous ?? future ?? (key.startsWith("scale") || key === "opacity" ? 1 : 0);
        }
        resolved.push(output);
    });
    const forward = Array.from({ length: frameCount }, (_, index) => {
        const linear = index / (frameCount - 1);
        const segmentPosition = linear * (resolved.length - 1);
        const segment = Math.min(resolved.length - 2, Math.floor(segmentPosition));
        const segmentLinear = index === frameCount - 1 ? 1 : segmentPosition - segment;
        const progress =
            transition.type === "spring"
                ? springProgress(segmentLinear, transition)
                : timingProgress(segmentLinear, transition.easing);
        const frame: SerializedRuntimeFrame = {};
        for (const key of keys) {
            const start = resolved[segment][key];
            const end = resolved[segment + 1][key];
            frame[key] =
                typeof start === "string" || typeof end === "string"
                    ? interpolateColor(String(start), String(end), Math.max(0, Math.min(1, progress)))
                    : start + (end - start) * progress;
        }
        return frame;
    });
    const frames = transition.repeatReverse ? [...forward, ...forward.slice(1, -1).toReversed()] : forward;
    return {
        frames,
        interval: Math.max(16, Math.round(duration / Math.max(1, frames.length - 1))),
    };
}
