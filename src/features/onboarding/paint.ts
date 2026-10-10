import { withAlpha } from "@/features/appearance/color";

/**
 * A soft radial glow filling its box: each stop is an opacity of `color`, optionally at a
 * position, and it always fades out to the edge. The fade ends on the same color at zero
 * opacity rather than `transparent`, which would blend through gray.
 */
export function glow(color: string, ...stops: [opacity: number, position?: number][]) {
    const colorStops = stops.map(([opacity, position]) =>
        position == null ? withAlpha(color, opacity) : `${withAlpha(color, opacity)} ${position}%`);
    return `radial-gradient(closest-side, ${[...colorStops, withAlpha(color, 0)].join(", ")})`;
}
