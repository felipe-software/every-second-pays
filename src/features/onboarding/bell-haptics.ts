import { scoreHaptic, type ScoreHaptic } from "@/features/haptics/haptics";
import { type Note, payoff, sparkle } from "@/features/haptics/score";

import { ALLOWED, BELL_CUES, type BellCue, COIN, DECLINED } from "./bell-timeline";

const ENTER_SCORE: Note[] = [[100, "lowTick", 0.35]];

const ASK_SCORE: Note[] = [
    [COIN.hit - 150, "quickRise", 0.2],
    ...payoff(COIN.hit, 1, "quickFall", 0.6),
    ...sparkle(COIN.hit + 200, [0.3, 0.2], 95),
    [COIN.bounce, "click", 0.45],
    [COIN.hop, "tick", 0.3],
    ...[0.2, 0.15, 0.1].map((scale, index): Note => [COIN.hop + 120 + index * 120, "lowTick", scale]),
];

const [FIRST_HIT, SECOND_HIT, LAST_HIT] = ALLOWED.coins.map((offset) => offset + COIN.hit);
const LAST_COIN = ALLOWED.coins[ALLOWED.coins.length - 1];

const ALLOWED_SCORE: Note[] = [
    ...payoff(FIRST_HIT, 0.7, "quickFall", 0.4),
    ...payoff(SECOND_HIT, 0.85, "quickFall", 0.45),
    ...payoff(LAST_HIT, 1, "thud", 0.8),
    ...sparkle(LAST_HIT + 340, [0.35, 0.3, 0.25], 70),
    [LAST_COIN + COIN.bounce, "tick", 0.25],
    [LAST_COIN + COIN.hop, "lowTick", 0.15],
];

// No click and no body: this one should land, not ring.
const DECLINED_SCORE: Note[] = [
    [DECLINED.land, "tick", 0.4],
    [DECLINED.land + 20, "quickFall", 0.2],
    [DECLINED.land + DECLINED.settle, "lowTick", 0.25],
    [DECLINED.land + DECLINED.settle + 140, "lowTick", 0.15],
];

const fromCue = (cue: BellCue, score: Note[]) =>
    scoreHaptic(score.map(([time, primitive, scale]) => [time - BELL_CUES[cue], primitive, scale]));

export const BELL_HAPTICS: Record<BellCue, ScoreHaptic> = {
    enter: fromCue("enter", ENTER_SCORE),
    ask: fromCue("ask", ASK_SCORE),
    allowed: fromCue("allowed", ALLOWED_SCORE),
    declined: fromCue("declined", DECLINED_SCORE),
};
