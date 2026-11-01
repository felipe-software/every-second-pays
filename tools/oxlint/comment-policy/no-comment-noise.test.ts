import { RuleTester } from "oxlint/plugins-dev";

import { noCommentNoiseRule } from "./no-comment-noise.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

tester.run("comment-policy/no-comment-noise", noCommentNoiseRule, {
    valid: [
        "// Android reports the inset late, so it is measured after layout.\nconst a = 1;",
        "// SAFETY: Validation above established the invariant.\nconst a = value as Id;",
        "// eslint-disable-next-line no-console\nconsole.log(1);",
        "// @ts-expect-error upstream types are wrong\nconst a = 1;",
        "/** @type {import('expo/fingerprint').Config} */\nconst config = {};",
        "// https://github.com/expo/expo/issues/1234567890/a/very/long/link/that/explains/this/workaround/in/detail\nconst a = 1;",
        "const a = 1; // first\nconst b = 2; // second",
    ],
    invalid: [
        { code: "/** Adds two numbers. */\nfunction add() {}", errors: [{ messageId: "docblock" }] },
        { code: "/* one\n two */\nconst a = 1;", errors: [{ messageId: "multiLine" }] },
        { code: "// first line\n// second line\nconst a = 1;", errors: [{ messageId: "multiLine" }] },
        { code: "// --- helpers ---\nconst a = 1;", errors: [{ messageId: "sectionHeader" }] },
        { code: "// now uses the new store\nconst a = 1;", errors: [{ messageId: "narration" }] },
        { code: "// const old = 1;\nconst a = 1;", errors: [{ messageId: "commentedOutCode" }] },
        { code: "// doThing(value)\nconst a = 1;", errors: [{ messageId: "commentedOutCode" }] },
        { code: `// ${"long ".repeat(25)}\nconst a = 1;`, errors: [{ messageId: "tooLong" }] },
    ],
});
