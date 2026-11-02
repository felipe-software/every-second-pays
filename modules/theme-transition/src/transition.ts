import { requireOptionalNativeModule } from "expo";

export type ThemeTransitionOrigin = { x: number; y: number };

type ThemeTransitionNative = {
    begin(frameKey: string | null): boolean;
    commit(originX: number, originY: number, durationMs: number, settleFrames: number): void;
    flip(from: string, to: string, originX: number, originY: number, durationMs: number): boolean;
    endBurst(settleFrames: number, fadeMs: number): void;
    clearFrames(): void;
};

type RevealOptions = { durationMs?: number; frameKey?: string };

type LookChange<T> = {
    look: T;
    from: string;
    to: string;
    apply: () => void;
    origin?: ThemeTransitionOrigin;
    reduceMotion: boolean;
    durationMs?: number;
};

type Burst = { look: unknown; live: string; shown: string; apply: () => void; finalizing: string | null };

const NATIVE = requireOptionalNativeModule<ThemeTransitionNative>("ThemeTransition");

const REVEAL_DURATION_MS = 650;
const SETTLE_FRAMES = 3;
const COVER_FADE_MS = 120;
const FRAME_LIFETIME_MS = 1500;
const QUIET_AFTER_REVEAL_MS = 50;

let scheduleCommit: (() => void) | null = null;
let pendingReveal: { origin?: ThemeTransitionOrigin; durationMs: number; frameKey: string | null } | null = null;
let burst: Burst | null = null;
let quietTimer: ReturnType<typeof setTimeout> | null = null;
let frameTimer: ReturnType<typeof setTimeout> | null = null;

export function attachCommitScheduler(schedule: (() => void) | null) {
    scheduleCommit = schedule;
}

function originX(origin?: ThemeTransitionOrigin) {
    return origin?.x ?? -1;
}

function originY(origin?: ThemeTransitionOrigin) {
    return origin?.y ?? -1;
}

function keepFrames(lifetimeMs: number) {
    if (frameTimer) clearTimeout(frameTimer);
    frameTimer = setTimeout(() => {
        if (burst) keepFrames(lifetimeMs);
        else NATIVE?.clearFrames();
    }, lifetimeMs);
}

function reveal(apply: () => void, origin: ThemeTransitionOrigin | undefined, options: RevealOptions) {
    pendingReveal = {
        origin,
        durationMs: options.durationMs ?? REVEAL_DURATION_MS,
        frameKey: options.frameKey ?? null,
    };
    scheduleCommit?.();
    apply();
}

function settleBurst() {
    if (quietTimer) clearTimeout(quietTimer);
    quietTimer = null;
    if (!burst) return;
    if (burst.shown === burst.live) {
        NATIVE?.endBurst(0, COVER_FADE_MS);
        burst = null;
        return;
    }
    burst.finalizing = burst.shown;
    scheduleCommit?.();
    burst.apply();
}

export function flushLookBurst() {
    settleBurst();
}

export function shownLook<T>(committed: T): T {
    return burst ? (burst.look as T) : committed;
}

// Runs inside the boundary's getSnapshotBeforeUpdate: rendered, but not yet committed.
export function commitPendingTransition() {
    if (burst?.finalizing) {
        const settled = burst.finalizing;
        burst.live = settled;
        burst.finalizing = null;
        if (burst.shown === settled) {
            burst = null;
            queueMicrotask(() => NATIVE?.endBurst(SETTLE_FRAMES, COVER_FADE_MS));
        }
    }
    if (!pendingReveal || !NATIVE) return;
    const { origin, durationMs, frameKey } = pendingReveal;
    pendingReveal = null;
    if (!NATIVE.begin(frameKey)) return;
    queueMicrotask(() => NATIVE.commit(originX(origin), originY(origin), durationMs, SETTLE_FRAMES));
}

export function revealChange(
    apply: () => void,
    origin: ThemeTransitionOrigin | undefined,
    reduceMotion: boolean,
    options: RevealOptions = {},
) {
    settleBurst();
    if (reduceMotion || !scheduleCommit || !NATIVE) {
        apply();
        return;
    }
    reveal(apply, origin, options);
}

export function transitionLook<T>({ look, from, to, apply, origin, reduceMotion, durationMs = REVEAL_DURATION_MS }: LookChange<T>) {
    if (reduceMotion || !scheduleCommit || !NATIVE) {
        settleBurst();
        apply();
        return;
    }

    const shown = burst?.shown ?? from;
    if (shown === to) return;
    keepFrames(Math.max(FRAME_LIFETIME_MS, durationMs + QUIET_AFTER_REVEAL_MS * 2));

    if (NATIVE.flip(shown, to, originX(origin), originY(origin), durationMs)) {
        burst = { look, live: burst?.live ?? from, shown: to, apply, finalizing: burst?.finalizing ?? null };
        if (quietTimer) clearTimeout(quietTimer);
        quietTimer = setTimeout(settleBurst, durationMs + QUIET_AFTER_REVEAL_MS);
        return;
    }

    if (quietTimer) clearTimeout(quietTimer);
    quietTimer = null;
    burst = null;
    reveal(apply, origin, { durationMs, frameKey: shown });
}
