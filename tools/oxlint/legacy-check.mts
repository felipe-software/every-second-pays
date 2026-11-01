import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const LEGACY_PATH = new URL("./legacy.json", import.meta.url);
const OXLINT_ARGS = ["--type-aware", "--format=json"];

type Diagnostic = { code: string; filename: string };

function ruleNameOf(code: string): string {
    return code.replace(/^(.+)\((.+)\)$/u, "$1/$2");
}

function currentViolations(): Map<string, Set<string>> {
    const result = spawnSync("bunx", ["oxlint", ...OXLINT_ARGS], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, OXLINT_IGNORE_LEGACY: "1" },
    });
    const { diagnostics }: { diagnostics: Diagnostic[] } = JSON.parse(result.stdout);
    const violations = new Map<string, Set<string>>();
    diagnostics.forEach(({ code, filename }) => {
        const rule = ruleNameOf(code);
        violations.set(rule, (violations.get(rule) ?? new Set()).add(filename));
    });
    return violations;
}

function sortedLegacy(violations: Map<string, Set<string>>): Record<string, string[]> {
    const entries = [...violations.entries()].map(([rule, files]) => [rule, [...files].toSorted()] as const);
    return Object.fromEntries(entries.toSorted(([a], [b]) => a.localeCompare(b)));
}

const violations = currentViolations();

if (process.argv.includes("--write")) {
    writeFileSync(LEGACY_PATH, `${JSON.stringify(sortedLegacy(violations), null, 4)}\n`);
    process.exit(0);
}

const legacy: Record<string, string[]> = JSON.parse(readFileSync(LEGACY_PATH, "utf8"));
const stale = Object.entries(legacy).flatMap(([rule, files]) =>
    files.filter((file) => !violations.get(rule)?.has(file)).map((file) => `${rule}: ${file}`),
);

if (stale.length > 0) {
    console.error(`These files are fixed. Remove them from tools/oxlint/legacy.json:\n${stale.join("\n")}`);
    process.exit(1);
}
