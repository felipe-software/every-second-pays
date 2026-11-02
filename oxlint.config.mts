import { readFileSync } from "node:fs";

import { defineConfig } from "oxlint";

const LEGACY_PATH = new URL("./tools/oxlint/legacy.json", import.meta.url);
const legacy: Record<string, string[]> =
    process.env.OXLINT_IGNORE_LEGACY === "1" ? {} : JSON.parse(readFileSync(LEGACY_PATH, "utf8"));

export default defineConfig({
    ignorePatterns: [
        "**/dist",
        "**/.expo",
        "**/.fallow",
        "**/build",
        "android/**",
        "ios/**",
        "goldie/out/**",
        "privacy-policy-site/**",
        "tools/oxlint/anti-slop/**",
        "tools/oxlint/comment-policy/**",
        "uniwind-types.d.ts",
        "src/uniwind-types.d.ts",
    ],
    jsPlugins: [
        { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
        { name: "comment-policy", specifier: "./tools/oxlint/comment-policy/index.ts" },
    ],
    plugins: ["eslint", "typescript", "oxc", "unicorn", "import", "react", "jsx-a11y"],
    categories: {
        correctness: "error",
        suspicious: "warn",
    },
    env: { builtin: true },
    settings: {
        react: { version: "19.2.3" },
    },
    rules: {
        "anti-slop/no-chained-type-assertions": "error",
        "anti-slop/no-conditional-empty-object-spread": "error",
        "anti-slop/no-known-value-widening": "error",
        "anti-slop/no-module-mocking": "error",
        "anti-slop/no-object-parameters": "error",
        "anti-slop/no-reflect-apply": "error",
        "anti-slop/no-reflect-get": "error",
        "anti-slop/no-unknown-returns": "error",
        "anti-slop/no-unknown-type-aliases": "error",
        "anti-slop/no-unsafe-dictionary-type": "error",
        "anti-slop/no-widen-then-assert": "error",
        "anti-slop/require-safety-comment-for-type-assertion": "error",
        "comment-policy/no-comment-noise": "error",

        "eslint/no-void": ["error", { allowAsStatement: true }],
        "typescript/no-floating-promises": "error",
        "typescript/no-misused-promises": "error",

        "eslint/complexity": ["error", { max: 15 }],
        "eslint/max-depth": ["error", { max: 3 }],
        "eslint/max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
        "eslint/max-lines-per-function": ["error", { max: 120, skipBlankLines: true, skipComments: true }],
        "eslint/max-nested-callbacks": ["error", { max: 3 }],
        "eslint/max-params": ["error", { max: 4 }],
        "eslint/no-nested-ternary": "error",

        "import/no-unassigned-import": "off",
        "jsx-a11y/prefer-tag-over-role": "off",
        "react/exhaustive-effect-dependencies": "off",
        "react/no-unstable-nested-components": "off",
        "react/react-in-jsx-scope": "off",
        "react/style-prop-object": "off",
        "unicorn/require-module-specifiers": "off",
    },
    overrides: [
        {
            files: ["**/*.test.*", "**/*.spec.*"],
            rules: {
                "anti-slop/no-module-mocking": "off",
                "eslint/complexity": "off",
                "eslint/max-depth": "off",
                "eslint/max-lines": "off",
                "eslint/max-lines-per-function": "off",
                "eslint/max-nested-callbacks": "off",
                "react/globals": "off",
            },
        },
        {
            files: ["src/features/i18n/translations.ts"],
            rules: { "eslint/max-lines": "off" },
        },
        ...Object.entries(legacy).map(([rule, files]) => ({ files, rules: { [rule]: "off" as const } })),
    ],
});
