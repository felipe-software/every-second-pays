/// <reference types="node" />
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { drawBackground, drawBanknoteBorder, drawBill, drawCopy, drawGrain, MARGIN, ROOT, TILE } from "./draw";
import { encodeOpaquePng } from "./png";
import { type Assets, BACK_BILLS, FRONT_BILLS, SCENES, TILES } from "./tiles";

const LOCALE = "en-US";
const COPY_TOP = 120;

const { values: args } = parseArgs({ options: { raw: { type: "string" }, out: { type: "string" } } });
const rawDir = args.raw ?? join(ROOT, "goldie/out/raw/pixel-10-pro");
const outDir = args.out ?? join(ROOT, "goldie/out/art");

async function loadAssets(): Promise<Assets> {
    const [frame, bill, icon, ...screens] = await Promise.all([
        loadImage(join(ROOT, "goldie/assets/pixel_8/frame.webp")),
        loadImage(join(ROOT, "src/assets/images/android-icon-foreground.png")),
        loadImage(join(ROOT, "src/assets/images/play-store-icon.png")),
        ...SCENES.map((scene) => loadImage(join(rawDir, `${scene}.png`))),
    ]);
    return { frame, bill, icon, screens: Object.fromEntries(SCENES.map((scene, i) => [scene, screens[i]])) as Assets["screens"] };
}

const assets = await loadAssets();
const width = TILE.width * TILES.length;
const strip = createCanvas(width, TILE.height);
const ctx = strip.getContext("2d");

drawBackground(ctx, width);
drawBanknoteBorder(ctx, width);
for (const bill of BACK_BILLS) drawBill(ctx, assets.bill, bill);
TILES.forEach((tile, index) => tile.draw(ctx, assets, index * TILE.width));
for (const bill of FRONT_BILLS) drawBill(ctx, assets.bill, bill);
TILES.forEach((tile, index) => drawCopy(ctx, tile.copy, index * TILE.width + MARGIN, COPY_TOP));
drawGrain(ctx, width);

const localeDir = join(outDir, LOCALE);
await mkdir(localeDir, { recursive: true });
for (const [index, tile] of TILES.entries()) {
    const shot = createCanvas(TILE.width, TILE.height);
    shot.getContext("2d").drawImage(strip, index * TILE.width, 0, TILE.width, TILE.height, 0, 0, TILE.width, TILE.height);
    await writeFile(join(localeDir, `${String(index + 1).padStart(2, "0")}-${tile.id}.png`), encodeOpaquePng(shot));
}

const preview = createCanvas(Math.round(width / 3), Math.round(TILE.height / 3));
preview.getContext("2d").drawImage(strip, 0, 0, preview.width, preview.height);
await writeFile(join(outDir, `${LOCALE}-panorama.png`), encodeOpaquePng(preview));
console.log(`Wrote ${TILES.length} screenshots to ${localeDir}`);
