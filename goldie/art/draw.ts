/// <reference types="node" />
import { createCanvas, GlobalFonts, type Canvas, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const TILE = { width: 1080, height: 1920 };
export const MARGIN = 84;
const RAW = { width: 1080, height: 2400 };
const FRAME = {
    width: 1187,
    height: 2513,
    screen: { x: 47, y: 53, width: 1084, height: 2404 },
    screenRadius: 80,
    bodyRadius: 150,
};
const BILL_BOX = { x: 293, y: 296, width: 438, height: 408 };

export const INK = {
    cream: "#F6F1E3",
    sub: "#B4D3BE",
    eyebrow: "#8FD3A8",
    chip: "#CFF0DB",
    chipInk: "#0F2E1A",
    live: "#2FD07A",
    sheet: "#F0F7F3",
    glow: "120, 214, 150",
    line: "160, 230, 186",
};

export const ACCENTS = ["#E8763A", "#58AD85", "#619FE5", "#D9829D", "#A38ADE"];

const SKY: [tile: number, color: string][] = [
    [0, "#245A31"],
    [3.3, "#1F5029"],
    [4.3, "#183F21"],
    [5.1, "#0F2716"],
    [6, "#0B1A10"],
];

const FONT_DIR = join(ROOT, "node_modules/@expo-google-fonts/archivo");
const WEIGHTS = ["500Medium", "700Bold", "800ExtraBold"] as const;
for (const weight of WEIGHTS) GlobalFonts.registerFromPath(join(FONT_DIR, weight, `Archivo_${weight}.ttf`), `Archivo ${weight}`);
const font = (weight: (typeof WEIGHTS)[number], size: number) => `${size}px "Archivo ${weight}"`;

export type Ctx = SKRSContext2D;
export type Rect = { x: number; y: number; width: number; height: number; radius: number };
export type Placement = { cx: number; top: number; scale: number; rotate?: number };
export type Run = { text: string; chip?: boolean; live?: boolean };
export type Copy = { eyebrow: string; headline: Run[][]; subhead: string[] };
export type Bill = { x: number; y: number; size: number; rotate: number; blur?: number; alpha?: number; motion?: number };
export type Popout = { crop: Rect; zoom: number; at?: { x: number; y: number }; dx?: number; dy?: number; rotate?: number; shadow?: number };

const radians = (degrees: number) => (degrees * Math.PI) / 180;

function mix(from: string, to: string, amount: number) {
    const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const a = channels(from);
    const b = channels(to);
    return `#${a.map((value, i) => Math.round(value + (b[i] - value) * amount).toString(16).padStart(2, "0")).join("")}`;
}

const edgeOf = (face: string, deep = false) => mix(face, "#000000", deep ? 0.24 : 0.16);

function random(seed: number) {
    let state = seed;
    return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

function roundRectPath(ctx: Ctx, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
}

function raised(ctx: Ctx, x: number, y: number, width: number, height: number, radius: number, face: string, depth: number) {
    ctx.fillStyle = edgeOf(face);
    roundRectPath(ctx, x, y + depth, width, height, radius);
    ctx.fill();
    ctx.fillStyle = face;
    roundRectPath(ctx, x, y, width, height, radius);
    ctx.fill();
}

function withShadow(ctx: Ctx, blur: number, offsetY: number, alpha: number, draw: () => void) {
    ctx.save();
    ctx.shadowColor = `rgba(2, 12, 5, ${alpha})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = offsetY;
    draw();
    ctx.restore();
}

function phoneSize(p: Placement) {
    return { width: FRAME.width * p.scale, height: FRAME.height * p.scale };
}

export function screenPoint(p: Placement, rx: number, ry: number) {
    const { width, height } = phoneSize(p);
    const lx = (FRAME.screen.x + (rx * FRAME.screen.width) / RAW.width) * p.scale - width / 2;
    const ly = (FRAME.screen.y + (ry * FRAME.screen.height) / RAW.height) * p.scale - height / 2;
    const angle = radians(p.rotate ?? 0);
    return {
        x: p.cx + lx * Math.cos(angle) - ly * Math.sin(angle),
        y: p.top + height / 2 + lx * Math.sin(angle) + ly * Math.cos(angle),
    };
}

export function drawPhone(ctx: Ctx, frame: Image, screen: Image, p: Placement, overScreen?: (ctx: Ctx) => void) {
    const { width, height } = phoneSize(p);
    ctx.save();
    ctx.translate(p.cx, p.top + height / 2);
    ctx.rotate(radians(p.rotate ?? 0));
    ctx.translate(-width / 2, -height / 2);
    ctx.scale(p.scale, p.scale);
    withShadow(ctx, 100, 56, 0.6, () => {
        ctx.fillStyle = "#0A0F0C";
        roundRectPath(ctx, 10, 10, FRAME.width - 20, FRAME.height - 20, FRAME.bodyRadius);
        ctx.fill();
    });

    const { x, y, width: screenWidth, height: screenHeight } = FRAME.screen;
    ctx.save();
    roundRectPath(ctx, x, y, screenWidth, screenHeight, FRAME.screenRadius);
    ctx.clip();
    ctx.drawImage(screen, x, y, screenWidth, screenHeight);
    if (overScreen) {
        ctx.translate(x, y);
        ctx.scale(screenWidth / RAW.width, screenHeight / RAW.height);
        overScreen(ctx);
    }
    ctx.restore();
    ctx.drawImage(frame, 0, 0);

    ctx.strokeStyle = "rgba(190, 240, 205, 0.2)";
    ctx.lineWidth = 3 / p.scale;
    roundRectPath(ctx, 3, 3, FRAME.width - 6, FRAME.height - 6, FRAME.bodyRadius);
    ctx.stroke();
    ctx.restore();
}

export function drawPopout(ctx: Ctx, screen: Image, phone: Placement, pop: Popout) {
    const { crop } = pop;
    const origin = pop.at ?? screenPoint(phone, crop.x + crop.width / 2, crop.y + crop.height / 2);
    const scale = phone.scale * (FRAME.screen.width / RAW.width) * pop.zoom;
    const shadow = pop.shadow ?? 70;
    const left = -crop.width / 2;
    const top = -crop.height / 2;
    ctx.save();
    ctx.translate(origin.x + (pop.dx ?? 0), origin.y + (pop.dy ?? 0));
    ctx.rotate(radians((phone.rotate ?? 0) + (pop.rotate ?? 0)));
    ctx.scale(scale, scale);
    withShadow(ctx, shadow, shadow * 0.6, 0.55, () => {
        ctx.fillStyle = "#000";
        roundRectPath(ctx, left, top, crop.width, crop.height, crop.radius);
        ctx.fill();
    });
    roundRectPath(ctx, left, top, crop.width, crop.height, crop.radius);
    ctx.clip();
    ctx.drawImage(screen, crop.x, crop.y, crop.width, crop.height, left, top, crop.width, crop.height);
    ctx.restore();
}

const blurredBills = new Map<string, Canvas>();

// Blurring straight onto the wide strip filters a strip-sized layer per draw, so blur small sprites once.
function billSprite(sprite: Image, size: number, blur: number) {
    const key = `${Math.round(size)}:${blur}`;
    const cached = blurredBills.get(key);
    if (cached) return cached;
    const height = (size * BILL_BOX.height) / BILL_BOX.width;
    const pad = Math.ceil(blur * 3);
    const canvas = createCanvas(Math.ceil(size) + pad * 2, Math.ceil(height) + pad * 2);
    const ctx = canvas.getContext("2d");
    if (blur) ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(sprite, BILL_BOX.x, BILL_BOX.y, BILL_BOX.width, BILL_BOX.height, pad, pad, size, height);
    blurredBills.set(key, canvas);
    return canvas;
}

export function drawBill(ctx: Ctx, sprite: Image, bill: Bill) {
    const alpha = bill.alpha ?? 1;
    const stamp = (offset: number, opacity: number, blur: number) => {
        const image = billSprite(sprite, bill.size, blur);
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(bill.x - offset * 0.45, bill.y - offset);
        ctx.rotate(radians(bill.rotate));
        ctx.drawImage(image, -image.width / 2, -image.height / 2);
        ctx.restore();
    };
    const steps = 10;
    for (let i = steps; i > 0 && bill.motion; i--) stamp((i / steps) * bill.motion * bill.size, alpha * 0.07, (bill.blur ?? 0) + 2);
    stamp(0, alpha, bill.blur ?? 0);
}

export function rain(seed: number, count: number, area: { x: number; y: number; width: number; height: number }, size: [number, number]) {
    const next = random(seed);
    return Array.from({ length: count }, (): Bill => ({
        x: area.x + next() * area.width,
        y: area.y + next() * area.height,
        size: size[0] + next() * (size[1] - size[0]),
        rotate: -35 + next() * 70,
    }));
}

function runWidth(ctx: Ctx, run: Run, size: number) {
    const text = ctx.measureText(run.text).width;
    return run.chip ? text + size * 0.36 + (run.live ? size * 0.42 : 0) : text;
}

function lineWidth(ctx: Ctx, line: Run[], size: number) {
    return line.reduce((total, run) => total + runWidth(ctx, run, size) + (run.chip ? size * 0.04 : 0), 0);
}

function drawChip(ctx: Ctx, run: Run, x: number, baseline: number, size: number) {
    const width = runWidth(ctx, run, size);
    raised(ctx, x, baseline - size * 0.86, width, size * 1.06, size * 0.22, INK.chip, size * 0.08);
    let textX = x + size * 0.18;
    if (run.live) {
        const dot = { x: textX + size * 0.14, y: baseline - size * 0.34 };
        ctx.fillStyle = "rgba(47, 208, 122, 0.3)";
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size * 0.21, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK.live;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size * 0.115, 0, Math.PI * 2);
        ctx.fill();
        textX += size * 0.42;
    }
    ctx.fillStyle = INK.chipInk;
    ctx.fillText(run.text, textX, baseline);
    return width;
}

export function drawCopy(ctx: Ctx, copy: Copy, x: number, top: number) {
    ctx.save();
    ctx.textBaseline = "alphabetic";
    ctx.font = font("700Bold", 30);
    ctx.letterSpacing = "6px";
    ctx.fillStyle = INK.eyebrow;
    ctx.fillText(copy.eyebrow.toUpperCase(), x, top + 26);

    let size = copy.headline.length === 1 ? 132 : 124;
    const widest = () => {
        ctx.font = font("800ExtraBold", size);
        ctx.letterSpacing = `${-0.03 * size}px`;
        return Math.max(...copy.headline.map((line) => lineWidth(ctx, line, size)));
    };
    while (widest() > TILE.width - MARGIN * 2) size -= 2;

    const lineHeight = size * 1.12;
    const headlineTop = top + 78;
    copy.headline.forEach((line, index) => {
        const baseline = headlineTop + size * 0.86 + index * lineHeight;
        let cursor = x;
        for (const run of line) {
            if (run.chip) {
                cursor += drawChip(ctx, run, cursor, baseline, size) + size * 0.04;
                continue;
            }
            ctx.fillStyle = INK.cream;
            ctx.fillText(run.text, cursor, baseline);
            cursor += ctx.measureText(run.text).width;
        }
    });

    const subTop = headlineTop + copy.headline.length * lineHeight + 34;
    ctx.font = font("500Medium", 42);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = INK.sub;
    copy.subhead.forEach((line, index) => ctx.fillText(line, x, subTop + 36 + index * 56));
    ctx.restore();
}

export function drawTick(ctx: Ctx, x: number, y: number, size: number, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = font("800ExtraBold", size);
    ctx.letterSpacing = `${-0.02 * size}px`;
    const text = "+$0.01";
    const width = ctx.measureText(text).width + size * 0.7;
    const height = size * 1.36;
    withShadow(ctx, 30, 14, 0.45, () => raised(ctx, x - width / 2, y - height / 2, width, height, height / 2, INK.chip, size * 0.1));
    ctx.fillStyle = INK.chipInk;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + size * 0.04);
    ctx.restore();
}

export function drawOrb(ctx: Ctx, x: number, y: number, radius: number, color: string, selected: boolean) {
    const disc = (dy: number, fill: Ctx["fillStyle"]) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(x, y + dy, radius, 0, Math.PI * 2);
        ctx.fill();
    };
    ctx.save();
    withShadow(ctx, radius * 0.7, radius * 0.35, 0.5, () => disc(radius * 0.12, edgeOf(color, true)));
    disc(0, color);
    const shine = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.45, 0, x - radius * 0.35, y - radius * 0.45, radius * 1.1);
    shine.addColorStop(0, "rgba(255, 255, 255, 0.28)");
    shine.addColorStop(1, "rgba(255, 255, 255, 0)");
    disc(0, shine);
    if (selected) {
        ctx.strokeStyle = color;
        ctx.lineWidth = radius * 0.1;
        ctx.beginPath();
        ctx.arc(x, y + radius * 0.06, radius * 1.24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = radius * 0.16;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.36, y + radius * 0.02);
        ctx.lineTo(x - radius * 0.08, y + radius * 0.28);
        ctx.lineTo(x + radius * 0.4, y - radius * 0.26);
        ctx.stroke();
    }
    ctx.restore();
}

export function drawLock(ctx: Ctx, cx: number, cy: number, size: number) {
    const bodyHeight = size * 0.78;
    const top = cy - bodyHeight / 2 + size * 0.2;
    const shackle = (color: string, dy: number) => {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(cx, top + dy, size * 0.3, Math.PI, 0);
        ctx.lineTo(cx + size * 0.3, top + dy + size * 0.1);
        ctx.moveTo(cx - size * 0.3, top + dy);
        ctx.lineTo(cx - size * 0.3, top + dy + size * 0.1);
        ctx.stroke();
    };
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = size * 0.15;
    shackle(edgeOf("#C9DDD0"), size * 0.03);
    shackle("#C9DDD0", 0);
    withShadow(ctx, 80, 44, 0.5, () => raised(ctx, cx - size / 2, top, size, bodyHeight, size * 0.17, INK.chip, size * 0.06));
    ctx.fillStyle = INK.chipInk;
    const holeY = top + bodyHeight * 0.44;
    ctx.beginPath();
    ctx.arc(cx, holeY, size * 0.085, 0, Math.PI * 2);
    ctx.fill();
    roundRectPath(ctx, cx - size * 0.035, holeY, size * 0.07, size * 0.2, size * 0.035);
    ctx.fill();
    ctx.restore();
}

export function drawSignature(ctx: Ctx, icon: Image, cx: number, cy: number) {
    const size = 112;
    const name = "Every Second Pays";
    ctx.save();
    ctx.font = font("700Bold", 46);
    ctx.letterSpacing = "-0.5px";
    const left = cx - (size + 30 + ctx.measureText(name).width) / 2;
    withShadow(ctx, 40, 16, 0.45, () => {
        ctx.fillStyle = "#2B5D2B";
        roundRectPath(ctx, left, cy - size / 2, size, size, size * 0.24);
        ctx.fill();
    });
    ctx.fillStyle = INK.cream;
    ctx.textBaseline = "middle";
    ctx.fillText(name, left + size + 30, cy + 2);
    roundRectPath(ctx, left, cy - size / 2, size, size, size * 0.24);
    ctx.clip();
    ctx.drawImage(icon, left, cy - size / 2, size, size);
    ctx.restore();
}

export function glow(ctx: Ctx, x: number, y: number, radius: number, alpha: number) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${INK.glow}, ${alpha})`);
    gradient.addColorStop(1, `rgba(${INK.glow}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

export function drawPulse(ctx: Ctx, x: number, y: number) {
    ctx.save();
    ctx.lineWidth = 3;
    [430, 560, 700, 850].forEach((radius, index) => {
        const fade = ctx.createLinearGradient(0, 600, 0, 900);
        fade.addColorStop(0, `rgba(${INK.line}, 0)`);
        fade.addColorStop(1, `rgba(${INK.line}, ${0.26 - index * 0.055})`);
        ctx.strokeStyle = fade;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
    });
    ctx.restore();
}

export function drawBackground(ctx: Ctx, width: number) {
    const base = ctx.createLinearGradient(0, 0, width, 0);
    for (const [tile, color] of SKY) base.addColorStop(Math.min(1, (tile * TILE.width) / width), color);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, TILE.height);

    const shade = ctx.createLinearGradient(0, 0, 0, TILE.height);
    shade.addColorStop(0, "rgba(0, 10, 4, 0)");
    shade.addColorStop(1, "rgba(0, 10, 4, 0.35)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, TILE.height);

    for (let x = 0; x < width; x += TILE.width) glow(ctx, x + 560, 1150, 820, x >= TILE.width * 5 ? 0.11 : 0.18);
}

export function drawBanknoteBorder(ctx: Ctx, width: number) {
    const inset = 38;
    const gap = 24;
    const radius = 54;
    const straight = TILE.height - (inset + radius) * 2;
    ctx.save();
    ctx.strokeStyle = `rgba(${INK.line}, 0.3)`;
    ctx.lineWidth = 2;
    roundRectPath(ctx, inset, inset, width - inset * 2, TILE.height - inset * 2, radius);
    ctx.stroke();
    roundRectPath(ctx, inset + gap, inset + gap, width - (inset + gap) * 2, TILE.height - (inset + gap) * 2, radius - gap);
    ctx.stroke();

    ctx.font = font("700Bold", 13);
    ctx.letterSpacing = "4px";
    ctx.fillStyle = `rgba(${INK.line}, 0.55)`;
    ctx.textBaseline = "middle";
    const phrase = "EVERY SECOND PAYS  •  ";
    const step = ctx.measureText(phrase).width;
    const microprint = (x: number, y: number, angle: number, length: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.rect(0, -gap, length, gap * 2);
        ctx.clip();
        for (let t = 0; t < length; t += step) ctx.fillText(phrase, t, 0);
        ctx.restore();
    };
    const middle = inset + gap / 2;
    microprint(inset + radius, middle, 0, width - (inset + radius) * 2);
    microprint(inset + radius, TILE.height - middle, 0, width - (inset + radius) * 2);
    microprint(middle, TILE.height - inset - radius, -Math.PI / 2, straight);
    microprint(width - middle, inset + radius, Math.PI / 2, straight);
    ctx.restore();
}

export function drawGrain(ctx: Ctx, width: number) {
    const size = 256;
    const tile = createCanvas(size, size);
    const noise = tile.getContext("2d");
    const image = noise.createImageData(size, size);
    const next = random(7);
    for (let i = 0; i < image.data.length; i += 4) {
        const value = next() * 255;
        image.data.set([value, value, value, 255], i);
    }
    noise.putImageData(image, 0, 0);
    const pattern = ctx.createPattern(tile as unknown as Canvas, "repeat");
    if (!pattern) return;
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, TILE.height);
    ctx.restore();
}
