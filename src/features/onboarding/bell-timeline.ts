// In ms. `notifications.json` is timed to these: change the art when you change one.
export const ENTER = 700;
export const COIN_EVERY = 3000;
export const COIN = { hit: 420, bounce: 1020, hop: 1280, gone: 1750 };
export const ALLOWED = { coins: [0, 300, 600], length: 2400 };
export const DECLINED = { land: 750, settle: 300, length: 2400 };

// A little before each score's first note, so a cue that reaches JS late doesn't cost it.
export const BELL_CUES = { enter: 40, ask: 120, allowed: 300, declined: 600 };
export type BellCue = keyof typeof BELL_CUES;
