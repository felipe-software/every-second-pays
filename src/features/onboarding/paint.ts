import { withAlpha } from "@/features/appearance/color";

// Fades to the same color at zero opacity: `transparent` would blend through gray.
export function glow(color: string, ...stops: [opacity: number, position?: number][]) {
    const colorStops = stops.map(([opacity, position]) =>
        position == null ? withAlpha(color, opacity) : `${withAlpha(color, opacity)} ${position}%`,
    );
    return `radial-gradient(closest-side, ${[...colorStops, withAlpha(color, 0)].join(", ")})`;
}
