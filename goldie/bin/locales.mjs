import { execFileSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { captureAdb } from "./capture-clock.mjs";
import { restartEmulator, startEmulator } from "./emulator.mjs";

// English last, so the raw folder goldie:studio reads ends up matching the config's default language.
const LOCALES = ["pt-BR", "es-ES", "fr-FR", "en-US"];
const OUT = fileURLToPath(new URL("../out/", import.meta.url));
const RAW = `${OUT}raw/pixel-10-pro`;

const capturesOf = (locale) => `${OUT}captures/${locale}`;

const goldie = (locale, command) =>
    execFileSync("bunx", ["goldie@0.5.0", command], { stdio: "inherit", env: { ...process.env, GOLDIE_LOCALE: locale } });

function replaceFolder(from, to) {
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
}

async function setDeviceLanguage(locale) {
    await startEmulator();
    captureAdb()("shell", "setprop", "persist.sys.locale", locale);
    // Android reads the language at boot. Restarting only the framework would lose the display cutout.
    await restartEmulator();
}

const [command, ...requested] = process.argv.slice(2);

for (const locale of requested.length > 0 ? requested : LOCALES) {
    if (command === "capture") {
        await setDeviceLanguage(locale);
        goldie(locale, "capture");
        replaceFolder(RAW, capturesOf(locale));
    } else {
        // Goldie keeps one raw folder per device on Android, so each language's captures live outside it.
        if (!existsSync(capturesOf(locale))) throw new Error(`No captures for ${locale}. Run: bun run goldie:capture ${locale}`);
        replaceFolder(capturesOf(locale), RAW);
    }
    goldie(locale, "frame");
    goldie(locale, "verify");
}
