import { scoreHaptic, useScoreHaptic } from "@/features/haptics/haptics";
import { type Note, payoff, sparkle } from "@/features/haptics/score";

const MODE_SCORE: Note[] = [...payoff(0, 0.9, "quickFall", 0.5), ...sparkle(180, [0.3, 0.2], 110)];
const PALETTE_SCORE: Note[] = [...payoff(0, 0.6, "quickFall", 0.3), ...sparkle(180, [0.2, 0.15], 110)];

const MODE_HAPTIC = scoreHaptic(MODE_SCORE);
const PALETTE_HAPTIC = scoreHaptic(PALETTE_SCORE);

export function useThemeHaptics() {
    const mode = useScoreHaptic(MODE_HAPTIC);
    const palette = useScoreHaptic(PALETTE_HAPTIC);
    return { mode: () => mode.play(), palette: () => palette.play() };
}
