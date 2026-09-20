const APP_ROOT = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/\/$/, "");
const config = {
    appRoot: APP_ROOT,

    // Goldie requires the iOS fields in its shared config shape, but this
    // project setup intentionally targets Google Play only.
    appPath: "",
    bundleId: "software.felipe.everysecondpays",

    android: {
        // Produced by: bun run goldie:build:android
        appPath: "./build/every-second-pays-release.apk",
        applicationId: "software.felipe.everysecondpays",
        // Pixel 8 skin bundled with the configured AVD. The screen slightly
        // overlaps the antialiased skin opening to avoid background seams.
        frame: {
            image: "./assets/pixel_8/back.webp",
            width: 1187,
            height: 2513,
            screen: { x: 44, y: 50, width: 1090, height: 2410 },
            screenRadius: 105,
        },
    },

    // Goldie names the Google Play phone output spec "pixel-10-pro". The local
    // Pixel_8 AVD is exposed through Goldie's supported pixel_9_pro profile
    // alias, so captures still run at the Pixel 8's native 1080x2400 size.
    devices: ["pixel-10-pro"],
    locales: ["en-US"],
    appearance: "light",

    // This value only applies if an iPhone target is added later. Android
    // uses android.frame above instead.
    frame: { variant: "17-pro-blue" },
    theme: {
        background: "linear-gradient(160deg, #D9F9EF 0%, #F2FDF9 55%, #FFFFFF 100%)",
        headlineColor: "#21170F",
        subheadColor: "#715341",
        fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif',
        copyHeightRatio: 0.24,
        deviceWidthRatio: 0.84,
        template: "showcase",
        layout: "duo-tilt",
        screenOnly: false,
    },
    store: {
        name: "Every Second Pays",
        subtitle: { "en-US": "Watch every second pay" },
        developer: "Felipe Software",
        category: "Finance",
        rating: 4.8,
        ratingCount: "",
        ageRating: "4+",
        price: "Free",
        description: {
            "en-US": "Track your earnings in real time, right on your device. No account, ads, analytics, or tracking.",
        },
    },

    scenes: [
        {
            kind: "screenshot",
            id: "today",
            flow: "store-01-home",
            headline: { "en-US": "Every second pays" },
            subhead: { "en-US": "See today's earnings at a glance." },
        },
        {
            kind: "screenshot",
            id: "income",
            flow: "store-02-income",
            headline: { "en-US": "Income on your terms" },
            subhead: { "en-US": "Hourly, monthly, or one-time." },
            layout: "classic",
        },
        {
            kind: "screenshot",
            id: "schedule",
            flow: "store-03-schedule",
            headline: { "en-US": "Built around your week" },
            subhead: { "en-US": "Set the days and hours that match your work." },
            layout: "hero",
        },
        {
            kind: "screenshot",
            id: "settings",
            flow: "store-04-settings",
            headline: { "en-US": "Make it yours" },
            subhead: { "en-US": "Pick your appearance, accent, and language." },
        },
    ],
};

export default config;
