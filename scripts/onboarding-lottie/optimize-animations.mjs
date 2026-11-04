import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { foldGradientMattes } from "./gradient-mattes.mjs";
import { splitIdleBlurs } from "./idle-blurs.mjs";

// Pre-serialized so the app skips stringifying up to ~900 KB on first launch.
const ROOT = new URL("../../src/assets/onboarding/", import.meta.url).pathname;

function jsonFiles(dir) {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return jsonFiles(path);
        return name.endsWith(".json") ? [path] : [];
    });
}

for (const path of jsonFiles(ROOT)) {
    const text = readFileSync(path, "utf8");
    const source = JSON.parse(text);
    const animation = typeof source.animation === "string" ? JSON.parse(source.animation) : source.animation;
    const blurs = splitIdleBlurs(animation);
    const mattes = foldGradientMattes(animation, source.tokens);
    const ending = text.endsWith("\n") ? "\n" : "";
    const optimized = JSON.stringify({ ...source, animation: JSON.stringify(animation) }) + ending;
    if (optimized === text) continue;
    writeFileSync(path, optimized);
    console.log(`${path.slice(ROOT.length)}: ${blurs} idle blurs split, ${mattes} gradient mattes folded`);
}
