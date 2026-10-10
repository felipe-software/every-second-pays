import { scoreHaptic } from "@/features/haptics/haptics";
import type { Note, Primitive } from "@/features/haptics/score";

import { BIRD, MONTH_WORKDAYS, STORY } from "./intro-timeline";

// A little before the first note, so a cue that reaches JS late doesn't cost it.
export const INTRO_HAPTICS_AT = 300;

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

function payoff(time: number, scale: number, body: Primitive, bodyScale: number): Note[] {
    return [[time, "click", scale], [time + 20, body, bodyScale]];
}

function sparkle(from: number, scales: number[], gap: number): Note[] {
    return scales.map((scale, index) => [from + index * gap, "tick", scale]);
}

// Offsets from the timeline's moments are read off the illustration's keyframes.
const SCORE: Note[] = [
    ...[230, 460, 1150].map((stroke, index): Note => [BIRD.at + stroke + 40, "lowTick", 0.4 + index * 0.05]),
    [BIRD.at + 1390, "slowRise", 0.8],

    ...payoff(STORY.burst, 1, "quickFall", 0.7),
    ...sparkle(STORY.burst + 200, [0.4, 0.3, 0.2], 95),

    [STORY.dives[0] - 120, "quickFall", 0.3],
    ...STORY.dives.map((time, hour): Note => [time, "click", 0.4 + hour * 0.06]),
    ...payoff(STORY.day, 0.9, "quickFall", 0.5),
    ...sparkle(STORY.day + 180, [0.3, 0.2], 110),

    ...range(8).map((bill): Note => [STORY.week + 30 + bill * 45, "lowTick", 0.22 + bill * 0.01]),
    [STORY.columns[0] - 185, "spin", 0.3],
    ...STORY.columns.flatMap((first, column) => range(8).map((bill): Note => bill === 0
        ? [first, "click", 0.55 + column * 0.1]
        : [first + bill * STORY.columnGap, "tick", 0.3 + column * 0.05 + bill * 0.02])),
    ...payoff(STORY.weekTotal, 1, "quickFall", 0.6),

    [STORY.month + 120, "quickRise", 0.5],
    [STORY.month + 292, "tick", 0.45],
    ...range(8).map((cell): Note => [STORY.month + 330 + cell * 40, "tick", 0.2 + cell * 0.015]),
    [STORY.workdays - 184, "spin", 0.3],
    ...range(MONTH_WORKDAYS).map((day): Note => {
        const time = STORY.workdays + day * STORY.workdayGap;
        return day % 5 === 0 ? [time, "click", 0.5 + (day / 5) * 0.1] : [time, "tick", 0.3 + day * 0.025];
    }),
    ...payoff(STORY.monthTotal, 1, "thud", 0.75),

    [STORY.year + 110, "spin", 0.4],
    [STORY.year + 250, "spin", 0.65],
    [STORY.year + 400, "click", 0.9],
    ...range(4).map((step): Note => [STORY.year + 550 + step * 40, "tick", 0.3]),
    [STORY.hop, "quickRise", 0.6],
    ...range(11).map((month): Note => [STORY.pile + month * STORY.pileGap, "click", 0.55 + month * 0.045]),
    ...payoff(STORY.finale, 1, "thud", 1),
    ...sparkle(STORY.finale + 350, [0.35, 0.3, 0.25, 0.2, 0.15], 70),
];

export const INTRO_HAPTICS = scoreHaptic(SCORE.map(([time, primitive, scale]) => [time - INTRO_HAPTICS_AT, primitive, scale]));
