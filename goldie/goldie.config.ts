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
        // Pixel 8 emulator skin (back.webp) with its 1080x2400 screen opening
        // at (49, 55) re-cut from an 89px to a 78px corner radius (frame.webp),
        // so the black bezel rim stays even around the corners. The screen
        // overlaps the opening by 2px to avoid background seams. Captures must
        // be clean rectangles: `bun run goldie:capture` swaps argent's
        // screenshot, which bakes in black rounded corners, for adb screencap.
        frame: {
            image: "./assets/pixel_8/frame.webp",
            width: 1187,
            height: 2513,
            screen: { x: 47, y: 53, width: 1084, height: 2404 },
            screenRadius: 80,
        },
    },

    // Goldie names the Google Play phone output spec "pixel-10-pro". The
    // Goldie_Pixel_8_API_36 AVD stays a real Pixel 8; goldie/bin/adb reports it
    // under Goldie's supported pixel_9_pro profile, so captures still run at the
    // Pixel 8's native 1080x2400 size.
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
            flow: "store-01-today",
            headline: { "en-US": "Every second pays" },
            subhead: { "en-US": "Watch today's earnings count up live." },
            layout: "hero",
        },
        {
            kind: "screenshot",
            id: "widget-home",
            flow: "store-02-widget-home",
            headline: { "en-US": "Live on your home screen" },
            subhead: { "en-US": "A widget that keeps counting while you work." },
            layout: "classic",
        },
        {
            kind: "screenshot",
            id: "schedule",
            flow: "store-03-schedule",
            headline: { "en-US": "Built around your day" },
            subhead: { "en-US": "Set your hours on a 24-hour dial." },
            layout: "tilt",
        },
        {
            kind: "screenshot",
            id: "income",
            flow: "store-04-income",
            headline: { "en-US": "Income on your terms" },
            subhead: { "en-US": "Hourly, monthly, yearly, or one-time." },
            layout: "classic",
        },
        {
            kind: "screenshot",
            id: "widget-editor",
            flow: "store-05-widget-editor",
            headline: { "en-US": "Style your widget" },
            subhead: { "en-US": "Pick its size, motion, and colors." },
            layout: "hero",
        },
        {
            kind: "screenshot",
            id: "settings",
            flow: "store-06-settings",
            headline: { "en-US": "Make it yours" },
            subhead: { "en-US": "Dark mode, accent colors, and four languages." },
            layout: "tilt-right",
        },
    ],
};

export default config;
