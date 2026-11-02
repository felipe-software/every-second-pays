#!/usr/bin/env bash
# usage: build.sh  (run after :app:assembleRelease; writes the isolated bench APK to $OUT/bench.apk)
set -euo pipefail
BENCH_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$BENCH_DIR/../.." && pwd)
OUT=${OUT:-/tmp/jelly-mac/bench}
ANDROID_SDK=${ANDROID_HOME:-$HOME/Library/Android/sdk}
BUILD_TOOLS=$(ls -d "$ANDROID_SDK"/build-tools/* | tail -1)
BASE_COMMIT=3492162
REL="$ROOT/android/app/build/outputs/apk/release/app-release.apk"

mkdir -p "$OUT/stage/assets"
if [ ! -d "$BENCH_DIR/.old-fork" ]; then
  mkdir -p "$BENCH_DIR/.old-fork"
  git -C "$ROOT" archive "$BASE_COMMIT" src/components/jelly-tabs | tar -x -C "$BENCH_DIR/.old-fork"
fi

cd "$ROOT"
APP_VARIANT=development EXPO_NO_TELEMETRY=1 EXPO_UNSTABLE_HEADLESS=1 CI=1 bunx expo export:embed \
  --platform android --dev false \
  --entry-file scripts/jelly-bench/entry.tsx \
  --bundle-output "$OUT/bench.bundle" --assets-dest "$OUT/res" 2>&1 | tail -2
node_modules/hermes-compiler/hermesc/osx-bin/hermesc -w -emit-binary -max-diagnostic-width=80 -O \
  -out "$OUT/stage/assets/index.android.bundle" "$OUT/bench.bundle"

cp "$REL" "$OUT/raw.apk"
zip -q -d "$OUT/raw.apk" assets/index.android.bundle
(cd "$OUT/stage" && zip -q -X -0 ../raw.apk assets/index.android.bundle)
"$BUILD_TOOLS/zipalign" -f -p 4 "$OUT/raw.apk" "$OUT/aligned.apk"
"$BUILD_TOOLS/apksigner" sign --ks "$ROOT/android/app/debug.keystore" --ks-pass pass:android \
  --ks-key-alias androiddebugkey --key-pass pass:android --out "$OUT/bench.apk" "$OUT/aligned.apk"
rm -f "$OUT/raw.apk" "$OUT/aligned.apk" "$OUT/bench.apk.idsig"

FINGER="$OUT/finger"
mkdir -p "$FINGER"
javac -nowarn -source 8 -target 8 -cp "$(ls -d "$ANDROID_SDK"/platforms/android-36)/android.jar" \
  -d "$FINGER" "$BENCH_DIR/finger/JellyFinger.java" 2>/dev/null
"$BUILD_TOOLS/d8" --min-api 26 --lib "$ANDROID_SDK/platforms/android-36/android.jar" \
  --output "$OUT/jellyfinger.jar" "$FINGER"/*.class
ls -la "$OUT/bench.apk" "$OUT/jellyfinger.jar"
