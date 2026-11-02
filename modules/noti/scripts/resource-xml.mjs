import fs from "node:fs";
import path from "node:path";

export const NS = 'xmlns:android="http://schemas.android.com/apk/res/android"';

const attrs = (values) =>
    Object.entries(values)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `android:${key}="${value}"`)
        .join(" ");

export const i = (name) => `@interpolator/${name}`;
export const translate = (o) => `<translate ${attrs(o)} />`;
export const alpha = (o) => `<alpha ${attrs(o)} />`;
export const scale = (o) => `<scale ${attrs({ pivotX: "50%", pivotY: "50%", ...o })} />`;
export const rotate = (o) => `<rotate ${attrs({ pivotX: "50%", pivotY: "50%", ...o })} />`;

// Translations go last: a <set> applies in order, and rotate/scale pivot on the view's center.
const order = (child) => (child.startsWith("<translate") ? 1 : 0);

export const animationSet = (children, { fillAfter = true, fillBefore = true } = {}) =>
    `<set ${NS} android:shareInterpolator="false" android:fillAfter="${fillAfter}" android:fillBefore="${fillBefore}">\n    ${children.toSorted((a, b) => order(a) - order(b)).join("\n    ")}\n</set>`;

export const round = (value, digits = 2) => Number(value.toFixed(digits));

// Seeded so regenerating produces identical files.
export function seededRandom(initial) {
    let seed = initial;
    const random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    };
    const between = (min, max) => min + random() * (max - min);
    return { random, between };
}

export function readOutputDirectories(script) {
    const [root, kotlinRoot] = process.argv.slice(2).map((directory) => path.resolve(directory));
    if (!root || !kotlinRoot) {
        console.error(`Usage: ${script} <res dir> <kotlin dir>`);
        process.exit(1);
    }
    return { root, kotlinRoot };
}

export function createResources(comment = "") {
    const files = {};
    const write = (relative, body) => {
        files[relative] = `<?xml version="1.0" encoding="utf-8"?>\n${comment}${body.trim()}\n`;
    };
    const anim = (name, children, options) => write(`anim/${name}.xml`, animationSet(children, options));
    return { files, write, anim };
}

export function writeResourceFiles(root, files) {
    for (const [relative, contents] of Object.entries(files)) {
        const file = path.join(root, relative);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, contents);
    }
}

export function writeKotlinFile(kotlinRoot, relativeDirectory, name, contents) {
    const directory = path.join(kotlinRoot, relativeDirectory);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, name), contents);
}
