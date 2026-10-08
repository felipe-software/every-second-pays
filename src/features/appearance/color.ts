function parseHex(hex: string) {
    const value = hex.replace("#", "");
    return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

function toHex(channel: number) {
    return Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0");
}

/** An opaque `#RRGGBB` color at `opacity`, as `rgba()`. */
export function withAlpha(hex: string, opacity: number) {
    const [red, green, blue] = parseHex(hex);
    return `rgba(${red},${green},${blue},${opacity})`;
}

/** Blends two opaque `#RRGGBB` colors; `amount` is how much of `to` ends up in the result. */
export function mixColors(from: string, to: string, amount: number) {
    const a = parseHex(from);
    const b = parseHex(to);
    return `#${a.map((channel, index) => toHex(channel + (b[index] - channel) * amount)).join("")}`;
}
