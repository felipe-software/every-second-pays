import type { Image } from "@napi-rs/canvas";

import {
    ACCENTS,
    type Bill,
    type Copy,
    type Ctx,
    drawBill,
    drawLock,
    drawOrb,
    drawPhone,
    drawPopout,
    drawPulse,
    drawSignature,
    drawTick,
    glow,
    INK,
    rain,
    type Rect,
    screenPoint,
} from "./draw";

export const SCENES = ["today", "widget-home", "schedule", "income", "widget-editor", "settings"] as const;
export type SceneId = (typeof SCENES)[number];
export type Assets = { frame: Image; bill: Image; icon: Image; screens: Record<SceneId, Image> };
type Tile = { id: string; copy: Copy; draw: (ctx: Ctx, assets: Assets, x: number) => void };

const PAY_BUTTON = { width: 302, height: 140, radius: 30 };

export const TILES: Tile[] = [
    {
        id: "today",
        copy: {
            eyebrow: "Live earnings",
            headline: [[{ text: "Your pay," }], [{ text: "live", chip: true, live: true }, { text: "." }]],
            subhead: ["Watch today's earnings tick up,", "second by second."],
        },
        draw(ctx, { frame, screens: { today } }, x) {
            const phone = { cx: x + 540, top: 720, scale: 0.64 };
            const counter = screenPoint(phone, 540, 420);
            drawPulse(ctx, counter.x, counter.y);
            drawPhone(ctx, frame, today, phone);
            drawPopout(ctx, today, phone, { crop: { x: 58, y: 750, width: 964, height: 242, radius: 42 }, zoom: 1.2, dx: -64, rotate: -3 });
            drawTick(ctx, x + 850, 905, 46, 1);
            drawTick(ctx, x + 925, 792, 38, 0.7);
            drawTick(ctx, x + 968, 694, 31, 0.42);
        },
    },
    {
        id: "widget-home",
        copy: {
            eyebrow: "Home screen widget",
            headline: [[{ text: "Right on your" }], [{ text: "home screen", chip: true }, { text: "." }]],
            subhead: ["A widget that keeps counting", "while you work."],
        },
        draw(ctx, { frame, bill, screens }, x) {
            const screen = screens["widget-home"];
            const phone = { cx: x + 540, top: 740, scale: 0.64 };
            const drops = rain(11, 12, { x: 90, y: 920, width: 900, height: 880 }, [60, 140]);
            drawPhone(ctx, frame, screen, phone, (inside) => {
                drops.forEach((drop, index) => drawBill(inside, bill, { ...drop, alpha: 0.5 + (index % 3) * 0.22 }));
            });
            drawPopout(ctx, screen, phone, { crop: { x: 67, y: 227, width: 946, height: 588, radius: 62 }, zoom: 1.28, dy: -16 });
        },
    },
    {
        id: "schedule",
        copy: {
            eyebrow: "Quick setup",
            headline: [[{ text: "Set it up in" }], [{ text: "one sentence", chip: true }, { text: "." }]],
            subhead: ["Who pays you, how much and when.", "That's it."],
        },
        draw(ctx, { frame, screens: { schedule } }, x) {
            const phone = { cx: x + 600, top: 760, scale: 0.64, rotate: 5 };
            drawPhone(ctx, frame, schedule, phone);
            drawPopout(ctx, schedule, phone, { crop: { x: 36, y: 560, width: 1008, height: 330, radius: 40 }, zoom: 1.3, dx: -66, dy: -14, rotate: -7 });
        },
    },
    {
        id: "income",
        copy: {
            eyebrow: "Any kind of pay",
            headline: [[{ text: "However you" }], [{ text: "get paid", chip: true }, { text: "." }]],
            subhead: ["Hourly, weekly, monthly or one-time,", "in any currency."],
        },
        draw(ctx, { frame, screens: { income } }, x) {
            const phone = { cx: x + 540, top: 760, scale: 0.64 };
            drawPhone(ctx, frame, income, phone, (inside) => {
                inside.fillStyle = INK.sheet;
                inside.fillRect(40, 1024, 1000, 344);
            });
            const grid = screenPoint(phone, 540, 1194);
            const buttons: [x: number, y: number, rotate: number][] = [
                [64, 1044, -4],
                [389, 1044, 3],
                [64, 1207, 3],
                [389, 1207, -2],
                [714, 1207, 4],
                [714, 1044, -3],
            ];
            buttons.forEach(([left, top, rotate], index) => {
                const selected = index === buttons.length - 1;
                const crop: Rect = { x: left, y: top, ...PAY_BUTTON };
                const origin = screenPoint(phone, left + PAY_BUTTON.width / 2, top + PAY_BUTTON.height / 2);
                drawPopout(ctx, income, phone, {
                    crop,
                    zoom: selected ? 1.5 : 1.32,
                    at: { x: grid.x + (origin.x - grid.x) * 1.3, y: grid.y - 30 + (origin.y - grid.y) * 1.45 },
                    dy: selected ? -24 : 0,
                    rotate,
                    shadow: selected ? 90 : 50,
                });
            });
        },
    },
    {
        id: "widget-editor",
        copy: {
            eyebrow: "Widget styles",
            headline: [[{ text: "Make it " }, { text: "rain", chip: true }, { text: "." }]],
            subhead: ["Pick your widget's size, motion,", "money flow and colors."],
        },
        draw(ctx, { frame, bill, screens }, x) {
            const screen = screens["widget-editor"];
            const phone = { cx: x + 540, top: 620, scale: 0.64 };
            for (const drop of rain(5, 12, { x: x - 30, y: 560, width: 1140, height: 1300 }, [60, 120])) drawBill(ctx, bill, { ...drop, alpha: 0.7, blur: 1.5 });
            drawPhone(ctx, frame, screen, phone);
            drawPopout(ctx, screen, phone, { crop: { x: 101, y: 366, width: 883, height: 397, radius: 50 }, zoom: 1.32, dy: 10 });
            const front: Bill[] = [
                { x: x + 110, y: 1290, size: 200, rotate: -18, motion: 0.45 },
                { x: x + 990, y: 1190, size: 170, rotate: 20, motion: 0.45 },
                { x: x + 170, y: 1770, size: 250, rotate: 10, motion: 0.4, blur: 3 },
                { x: x + 900, y: 1700, size: 220, rotate: -14, motion: 0.45 },
                { x: x + 600, y: 1520, size: 150, rotate: 26, motion: 0.4 },
            ];
            for (const drop of front) drawBill(ctx, bill, drop);
        },
    },
    {
        id: "settings",
        copy: {
            eyebrow: "Dark mode & colors",
            headline: [[{ text: "Make it" }], [{ text: "yours", chip: true }, { text: "." }]],
            subhead: ["Dark mode, five accent colors", "and four languages."],
        },
        draw(ctx, { frame, screens: { settings } }, x) {
            drawPhone(ctx, frame, settings, { cx: x + 450, top: 760, scale: 0.64, rotate: -4 });
            const orbs: [x: number, y: number, radius: number][] = [
                [930, 890, 56],
                [948, 1072, 62],
                [906, 1290, 76],
                [948, 1508, 62],
                [930, 1690, 56],
            ];
            orbs.forEach(([ox, oy, radius], index) => drawOrb(ctx, x + ox, oy, radius, ACCENTS[index], index === 2));
        },
    },
    {
        id: "privacy",
        copy: {
            eyebrow: "Private by design",
            headline: [[{ text: "No account." }], [{ text: "No ads." }], [{ text: "No " }, { text: "tracking", chip: true }, { text: "." }]],
            subhead: ["Everything stays on this phone."],
        },
        draw(ctx, { bill, icon }, x) {
            const center = { x: x + 540, y: 1220 };
            glow(ctx, center.x, center.y, 640, 0.16);
            const orbit = (angle: number, size: number, near: boolean): Bill => ({
                x: center.x + Math.cos(angle) * 360,
                y: center.y + Math.sin(angle) * 230 - 40,
                size,
                rotate: (angle * 180) / Math.PI / 6 - 14,
                alpha: near ? 1 : 0.6,
                blur: near ? 0 : 2,
                motion: near ? 0.35 : 0,
            });
            for (const [angle, size] of [[3.75, 110], [4.55, 96], [5.4, 120]]) drawBill(ctx, bill, orbit(angle, size, false));
            drawLock(ctx, center.x, center.y, 500);
            for (const [angle, size] of [[0.22, 190], [1.05, 210], [2.85, 175]]) drawBill(ctx, bill, orbit(angle, size, true));
            drawSignature(ctx, icon, x + 540, 1700);
        },
    },
];

export const BACK_BILLS: Bill[] = [
    { x: 1050, y: 1530, size: 150, rotate: 14, alpha: 0.9 },
    { x: 2185, y: 690, size: 110, rotate: -20, alpha: 0.75, blur: 1 },
    { x: 3220, y: 1450, size: 140, rotate: 18, alpha: 0.85 },
    { x: 1700, y: 660, size: 80, rotate: 24, alpha: 0.45, blur: 2 },
    { x: 3850, y: 690, size: 90, rotate: -16, alpha: 0.45, blur: 2 },
];

export const FRONT_BILLS: Bill[] = [
    { x: 1030, y: 1660, size: 210, rotate: -14, motion: 0.45 },
    { x: 2140, y: 1770, size: 250, rotate: 12, blur: 5, motion: 0.35 },
    { x: 3300, y: 1000, size: 160, rotate: 10, motion: 0.4 },
    { x: 5400, y: 1260, size: 170, rotate: -12, motion: 0.4 },
];
