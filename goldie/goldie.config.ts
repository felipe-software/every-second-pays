const APP_ROOT = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/\/$/, "");
const LOCALE = "en-US";

const BACKGROUND_STOPS = ["#2F6F35", "#2B6531", "#265A2D", "#215029", "#1C4625", "#183D21", "#14341D"];

const image = (name: string, x: number, y: number, width: number, rotate?: number) => ({
    kind: "image" as const,
    src: `art/${name}.png`,
    x,
    y,
    width,
    rotate,
});

const bill = (x: number, y: number, width: number, rotate: number) => image("bill", x, y, width, rotate);

const GLOW = image("glow", -0.25, 0.02, 1.5);

// x runs in tile widths from the strip's left edge, so a layer on a seam draws in both tiles.
const STRIP_BILLS = [
    bill(0.82, 0.03, 0.25, -10),
    bill(1.87, 0.1, 0.17, 18),
    bill(1.82, 0.56, 0.25, -14),
    bill(2.88, 0.05, 0.21, -18),
    bill(3.8, 0.03, 0.24, 12),
    bill(4.86, 0.14, 0.19, -16),
    bill(5.86, 0.04, 0.21, 10),
];

const stripBills = (tile: number) =>
    STRIP_BILLS.filter(({ x, width }) => x < tile + 1 && x + width > tile).map((layer) => ({ ...layer, x: layer.x - tile }));

const backdrop = (tile: number) => `linear-gradient(90deg, ${BACKGROUND_STOPS[tile]} 0%, ${BACKGROUND_STOPS[tile + 1]} 100%)`;

const SCREENS = [
    {
        id: "today",
        flow: "store-01-today",
        headline: "Watch every\nsecond pay",
        subhead: "See how much you make in real time.",
        layout: "hero",
        art: [
            image("tick", 0.04, 0.183, 0.27),
            image("tick", 0.69, 0.177, 0.22),
            image("tick-faded", 0.47, 0.179, 0.16),
        ],
    },
    {
        id: "widget-home",
        flow: "store-02-widget-home",
        headline: "Right on your\nhome screen",
        subhead: "It counts without opening the app.",
        layout: "classic",
        art: [
            bill(0.0, 0.24, 0.12, -22),
            bill(0.05, 0.42, 0.16, 12),
            bill(-0.02, 0.62, 0.13, 26),
            bill(0.06, 0.8, 0.15, -14),
            bill(0.87, 0.3, 0.13, 16),
            bill(0.87, 0.74, 0.11, 24),
        ],
    },
    {
        id: "widget-editor",
        flow: "store-03-widget-editor",
        headline: "Make it rain",
        subhead: "Choose how your money flows.",
        layout: "tilt",
        art: [
            bill(0.0, 0.02, 0.15, 16),
            bill(0.02, 0.15, 0.17, -18),
            bill(0.25, 0.165, 0.11, 12),
            bill(0.48, 0.15, 0.13, 22),
            bill(0.7, 0.14, 0.1, -12),
            bill(0.9, 0.3, 0.1, 18),
            bill(0.88, 0.48, 0.13, -20),
        ],
    },
    {
        id: "schedule",
        flow: "store-04-schedule",
        headline: "Set it up in\none sentence",
        subhead: "Hourly, monthly, yearly or one-time.",
        layout: "hero",
    },
    {
        id: "settings",
        flow: "store-05-settings",
        headline: "Make it yours",
        subhead: "Dark mode, five colors, four languages.",
        layout: "tilt-right",
        art: [
            image("orb-orange", 0.129, 0.225, 0.2),
            image("orb-green", 0.093, 0.34, 0.2),
            image("orb-blue", 0.056, 0.454, 0.2),
            image("orb-rose", 0.02, 0.569, 0.2),
            image("orb-lavender", -0.015, 0.683, 0.2),
        ],
    },
    {
        id: "privacy",
        flow: "store-06-privacy",
        headline: "No account.\nNo tracking.",
        subhead: "Everything stays on this phone.",
        layout: "classic",
        art: [
            bill(0.01, 0.34, 0.11, 14),
            bill(0.04, 0.66, 0.13, -14),
            bill(0.87, 0.5, 0.12, -18),
            bill(0.86, 0.8, 0.11, 12),
        ],
    },
] as const;

const config = {
    appRoot: APP_ROOT,

    // Required by Goldie's config shape; this project targets Google Play only.
    appPath: "",
    bundleId: "software.felipe.everysecondpays",

    android: {
        appPath: "./build/every-second-pays-release.apk",
        applicationId: "software.felipe.everysecondpays",
        // The screen overlaps the 1080x2400 opening at (49, 55) by 2px to hide background seams.
        frame: {
            image: "./assets/pixel_8/frame.webp",
            width: 1187,
            height: 2513,
            screen: { x: 47, y: 53, width: 1084, height: 2404 },
            screenRadius: 80,
        },
    },

    // Captured on the Pixel 8 AVD, which goldie/bin/adb reports as a supported pixel_9_pro.
    devices: ["pixel-10-pro"],
    locales: [LOCALE],
    appearance: "light",

    frame: { variant: "17-pro-blue" },
    theme: {
        background: backdrop(0),
        headlineColor: "#F7F4E6",
        subheadColor: "#C3E3CB",
        fontFamily: '"Bricolage Grotesque"',
        fontFiles: [
            {
                family: "Bricolage Grotesque",
                files: {
                    400: "./fonts/BricolageGrotesque-Medium.ttf",
                    700: "./fonts/BricolageGrotesque-ExtraBold.ttf",
                },
            },
        ],
        copyHeightRatio: 0.19,
        deviceWidthRatio: 0.84,
    },
    store: {
        name: "Every Second Pays",
        subtitle: { [LOCALE]: "Watch every second pay" },
        developer: "Felipe Software",
        category: "Finance",
        rating: 4.8,
        ratingCount: "",
        ageRating: "4+",
        price: "Free",
        description: {
            [LOCALE]: "Track your earnings in real time, right on your device. No account, ads, analytics, or tracking.",
        },
    },

    scenes: SCREENS.map((screen, tile) => ({
        kind: "screenshot" as const,
        id: screen.id,
        flow: screen.flow,
        headline: { [LOCALE]: screen.headline },
        subhead: { [LOCALE]: screen.subhead },
        layout: screen.layout,
        background: backdrop(tile),
        decorations: [GLOW, ...stripBills(tile), ...("art" in screen ? screen.art : [])],
    })),
};

export default config;
