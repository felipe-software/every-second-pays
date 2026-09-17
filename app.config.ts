import type { ExpoConfig } from "expo/config";

const IS_DEVELOPMENT = process.env.APP_VARIANT === "development";
const APP_IDENTIFIER = "software.felipe.everysecondpays";

const plugins: NonNullable<ExpoConfig["plugins"]> = [
    "expo-router",
    [
        "expo-splash-screen",
        {
            backgroundColor: "#F0F7F3",
            image: "./assets/images/icon.png",
            imageWidth: 200,
            resizeMode: "contain",
            dark: {
                backgroundColor: "#141816",
            },
        },
    ],
    "expo-sqlite",
    "expo-font",
    "expo-image",
    "expo-web-browser",
    [
        "expo-localization",
        {
            supportedLocales: ["en", "pt-BR", "es", "fr"],
            allowDynamicLocaleChangesAndroid: true,
        },
    ],
    "expo-asset",
];

if (IS_DEVELOPMENT) {
    plugins.push([
        "expo-dev-client",
        {
            addGeneratedScheme: true,
        },
    ]);
}

export default (): ExpoConfig => ({
    name: IS_DEVELOPMENT ? "Every Second Pays (Dev)" : "Every Second Pays",
    slug: "every-second-pays",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: IS_DEVELOPMENT ? "everysecondpays-dev" : "everysecondpays",
    userInterfaceStyle: "automatic",
    ios: {
        icon: "./assets/every-second-pays.icon",
        bundleIdentifier: IS_DEVELOPMENT ? `${APP_IDENTIFIER}.dev` : APP_IDENTIFIER,
    },
    android: {
        adaptiveIcon: {
            backgroundColor: "#366E38",
            foregroundImage: "./assets/images/android-icon-foreground.png",
            backgroundImage: "./assets/images/android-icon-background.png",
        },
        predictiveBackGestureEnabled: true,
        package: IS_DEVELOPMENT ? `${APP_IDENTIFIER}.dev` : APP_IDENTIFIER,
    },
    web: {
        output: "static",
        favicon: "./assets/images/favicon.png",
    },
    plugins,
    experiments: {
        typedRoutes: true,
        reactCompiler: true,
    },
    extra: {
        router: {},
        eas: {
            projectId: "84e9933c-067a-489e-b356-1526a665dbdc",
        },
    },
    owner: "felipesoftware",
});
