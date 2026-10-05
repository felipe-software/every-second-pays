/** @type {import('expo/fingerprint').Config} */
const config = {
    // Bun applies these patches to native modules, but the fingerprint only looks for a
    // root `patches` folder, so a native patch change wouldn't change the runtime version.
    extraSources: [{ type: "dir", filePath: "src/patches", reasons: ["bunPatchedDependencies"] }],
};

module.exports = config;
