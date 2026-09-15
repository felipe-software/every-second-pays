## Project environment

Environment inspected with Argent on 2026-09-15. Recheck running processes before starting a server.

```json
{
  "workspace": "/Users/mac/work/every-second-pays",
  "is_react_native": true,
  "is_native_ios": false,
  "is_native_android": false,
  "project_type": "Expo managed/CNG with generated ios/android projects",
  "expo": "~57.0.22",
  "react_native": "0.86.3",
  "react": "19.2.3",
  "expo_localization": "~57.0.2",
  "package_manager": "bun",
  "lockfile": "bun.lock",
  "platforms": ["ios", "android", "web"],
  "app_ids": {
    "ios": "software.felipe.everysecondpays",
    "android": "software.felipe.everysecondpays",
    "scheme": "everysecondpays"
  },
  "metro": {
    "configured_port": null,
    "running_port": null,
    "pid": null,
    "project_matches": false
  },
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "lint": "expo lint",
    "era": "expo run android",
    "eri": "expo run ios",
    "epc": "expo prebuild --clean",
    "reset-project": "node ./scripts/reset-project.js"
  },
  "qa": {
    "required": ["bunx expo lint", "bunx tsc --noEmit"],
    "existing_tests": "tests/earnings-store.test.js and tests/i18n.test.js (bun:test)",
    "test_command": "bun test",
    "saved_argent_flows_found": true,
    "ci_config": null
  },
  "build": {
    "ios": "bun run ios",
    "android": "bun run android",
    "ios_workspace": "ios/everysecondpays.xcworkspace",
    "ios_has_podfile": true,
    "android_has_gradle": true,
    "eas_config": null
  },
  "instructions": {
    "source": "AGENTS.md",
    "expo_api_changes": "Before touching Expo/RN APIs, fetch SDK 57 versioned docs; fetch Expo llms.txt for other Expo topics.",
    "package_commands": "Use bunx instead of npx; install native dependencies with bunx expo install.",
    "completion": "Run lint and typecheck before declaring done.",
    "routing": "Expo Router, src/app; non-route modules elsewhere."
  }
}
```

## Localization validation

- `src/features/i18n/i18n.tsx` supports English, Portuguese, Spanish and French via `expo-localization` hooks.
- The installed iOS Hermes runtime has no `Intl.NumberFormat.prototype.formatToParts`. Use the native decimal separator, with locale-formatted fallback when null.
- `uses24hourClock` may be null; preserve the locale default in that case.
- `tests/i18n.test.js` covers missing `formatToParts`, separators, language fallback, clock preferences, weekday labels and translation placeholders. `bun test` passed 11 tests, including the existing store tests; lint and typecheck passed.
- Confirmed app startup and decimal comma display on the running iPhone 17 Pro, plus number formatting in all four languages in Hermes. Android was not exercised in this session.
