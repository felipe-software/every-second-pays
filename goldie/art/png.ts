/// <reference types="node" />
import type { Canvas } from "@napi-rs/canvas";
import { crc32, deflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const RGB = 2;
const PAETH = 4;

function chunk(type: string, data: Buffer) {
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
}

function paeth(left: number, up: number, upLeft: number) {
    const estimate = left + up - upLeft;
    const toLeft = Math.abs(estimate - left);
    const toUp = Math.abs(estimate - up);
    const toUpLeft = Math.abs(estimate - upLeft);
    if (toLeft <= toUp && toLeft <= toUpLeft) return left;
    return toUp <= toUpLeft ? up : upLeft;
}

// Google Play rejects screenshots with an alpha channel, so this writes 8-bit RGB.
export function encodeOpaquePng(canvas: Canvas) {
    const { width, height } = canvas;
    const rgba = canvas.getContext("2d").getImageData(0, 0, width, height).data;
    const stride = width * 3;
    const filtered = Buffer.alloc((stride + 1) * height);
    let previous = new Uint8Array(stride);
    let current = new Uint8Array(stride);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const from = (y * width + x) * 4;
            current[x * 3] = rgba[from];
            current[x * 3 + 1] = rgba[from + 1];
            current[x * 3 + 2] = rgba[from + 2];
        }
        const row = y * (stride + 1);
        filtered[row] = PAETH;
        for (let i = 0; i < stride; i++) {
            const left = i >= 3 ? current[i - 3] : 0;
            const upLeft = i >= 3 ? previous[i - 3] : 0;
            filtered[row + 1 + i] = (current[i] - paeth(left, previous[i], upLeft)) & 0xff;
        }
        [previous, current] = [current, previous];
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8;
    header[9] = RGB;
    return Buffer.concat([SIGNATURE, chunk("IHDR", header), chunk("IDAT", deflateSync(filtered)), chunk("IEND", Buffer.alloc(0))]);
}
