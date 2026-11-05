import "@expo/metro-runtime";

import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { Asset } from "expo-asset";
import { App } from "expo-router/build/qualified-entry";
import { renderRootComponent } from "expo-router/build/renderRootComponent";
import { openDatabaseAsync } from "expo-sqlite";
import canvasKitModule from "canvaskit-wasm/bin/full/canvaskit.wasm";

const canvasKitWasm = Asset.fromModule(canvasKitModule).uri;

// Parallel first opens race in expo-sqlite's web worker and lose saved data.
async function startSQLite() {
    const database = await openDatabaseAsync(":memory:");
    await database.closeAsync();
}

// Skia reads the global CanvasKit when its module loads, before any screen renders.
void Promise.all([LoadSkiaWeb({ locateFile: () => canvasKitWasm }), startSQLite()]).then(() =>
    renderRootComponent(App),
);
