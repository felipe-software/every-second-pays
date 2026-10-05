/** @type {import('expo/fingerprint').Config} */
const config = {
    extraSources: [
        // Bun applies these patches to native modules, but the fingerprint only looks for a
        // root `patches` folder, so a native patch change wouldn't change the runtime version.
        { type: "dir", filePath: "src/patches", reasons: ["bunPatchedDependencies"] },
        // Decides which native libraries use RNRepo's prebuilt binaries or build from source.
        { type: "file", filePath: "rnrepo.config.json", reasons: ["rnrepoConfig"] },
    ],
};

module.exports = config;
