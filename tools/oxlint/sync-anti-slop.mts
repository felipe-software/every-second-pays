import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const UPSTREAM_URL = "https://github.com/dmmulroy/anti-slop.git";
const UPSTREAM_REVISION = "13909c9e07590f5a85d93c62712259fe14a883f7";
const BUNDLE_PATH = "skills/install-anti-slop/assets/anti-slop";
const VENDORED_PATH = fileURLToPath(new URL("./anti-slop", import.meta.url));

function git(args: string[], cwd?: string): void {
    const result = spawnSync("git", args, { cwd, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed:\n${result.stderr}`);
}

function filesIn(root: string): string[] {
    return readdirSync(root, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => relative(root, join(entry.parentPath, entry.name)))
        .toSorted();
}

function differences(expectedRoot: string, actualRoot: string): string[] {
    const expected = filesIn(expectedRoot);
    const actual = existsSync(actualRoot) ? filesIn(actualRoot) : [];
    const extra = actual.filter((file) => !expected.includes(file));
    const changed = expected.filter((file) => {
        const copy = join(actualRoot, file);
        return !existsSync(copy) || !readFileSync(copy).equals(readFileSync(join(expectedRoot, file)));
    });
    return [...changed, ...extra];
}

const workspace = mkdtempSync(join(tmpdir(), "anti-slop-"));
const checkout = join(workspace, "checkout");
const incoming = join(workspace, "incoming");

try {
    git(["clone", "--quiet", UPSTREAM_URL, checkout]);
    git(["checkout", "--quiet", UPSTREAM_REVISION], checkout);
    cpSync(join(checkout, BUNDLE_PATH), incoming, { recursive: true });
    cpSync(join(checkout, "LICENSE"), join(incoming, "LICENSE"));

    if (process.argv.includes("--check")) {
        const drift = differences(incoming, VENDORED_PATH);
        if (drift.length > 0) {
            console.error(`tools/oxlint/anti-slop differs from upstream ${UPSTREAM_REVISION}:\n${drift.join("\n")}`);
            process.exitCode = 1;
        }
    } else {
        rmSync(VENDORED_PATH, { recursive: true, force: true });
        cpSync(incoming, VENDORED_PATH, { recursive: true });
    }
} finally {
    rmSync(workspace, { recursive: true, force: true });
}
