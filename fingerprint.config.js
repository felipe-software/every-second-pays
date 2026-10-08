/** @type {import('expo/fingerprint').Config} */
const config = {
    sourceSkips: [
        "PackageJsonAndroidAndIosScriptsIfNotContainRun",
        // semantic-release bumps `version` every release; that alone mustn't lock out updates.
        "ExpoConfigVersions",
    ],
    // Gitignored prebuild output EAS never sees; hashing it breaks locally published updates.
    ignorePaths: ["android/**/*", "ios/**/*"],
    extraSources: [
        // Fingerprint only checks a root `patches` folder, so bun's native patches go unnoticed.
        { type: "dir", filePath: "src/patches", reasons: ["bunPatchedDependencies"] },
        { type: "file", filePath: "rnrepo.config.json", reasons: ["rnrepoConfig"] },
    ],
};

module.exports = config;
