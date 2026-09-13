const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

// expo-sqlite's web worker requires WASM and SharedArrayBuffer isolation.
if (!config.resolver.assetExts.includes("wasm")) config.resolver.assetExts.push("wasm");
const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
    const next = enhanceMiddleware ? enhanceMiddleware(middleware, server) : middleware;
    return (request, response, nextHandler) => {
        response.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
        response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        return next(request, response, nextHandler);
    };
};

module.exports = withUniwindConfig(config, {
    cssEntryFile: "./src/global.css",
    dtsFile: "./src/uniwind-types.d.ts",
});
