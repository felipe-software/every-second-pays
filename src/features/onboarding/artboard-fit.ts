import { ARTBOARD } from "./motion";

export type ArtboardFit = {
    scale: number;
    offsetX: number;
    offsetY: number;
    skipTop: number;
    footerBottom: number;
};

export function fitArtboard(
    window: { width: number; height: number },
    insets: { top: number; bottom: number },
): ArtboardFit {
    const scale = Math.min(window.width / ARTBOARD.width, window.height / ARTBOARD.height);
    const offsetX = (window.width - ARTBOARD.width * scale) / 2;
    const offsetY = (window.height - ARTBOARD.height * scale) / 2;
    const skipTop = Math.max(34, (insets.top + 4 - offsetY) / scale);
    const footerBottom = Math.max(28, ARTBOARD.height - (window.height - insets.bottom - 8 - offsetY) / scale);
    return { scale, offsetX, offsetY, skipTop, footerBottom };
}
