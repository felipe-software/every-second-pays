import type { PillJellyFrameConfig } from "./utils/pill-jelly-animation";

export interface TabBarLayoutConfig {
    iconSize: number;
    itemHeight: number;
    maskOverscanX: number;
    maskOverscanY: number;
    trackHeight: number;
    trackInset: number;
}

export const TABBAR_LAYOUT = {
    iconSize: 28,
    itemHeight: 56,
    maskOverscanX: 48,
    maskOverscanY: 16,
    trackHeight: 64,
    trackInset: 4,
} as const satisfies TabBarLayoutConfig;

export interface TabBarColors {
    activeContent: string;
    inactiveContent: string;
    selectedSurface: string;
    surface: string;
}

export const DEFAULT_TAB_BAR_COLORS: TabBarColors = {
    activeContent: "#11100f",
    inactiveContent: "#b8b4ad",
    selectedSurface: "#f2eee7",
    surface: "#22211f",
};

export interface TabBarOpacity {
    activeContent: number;
    inactiveContent: number;
    selectedSurface: number;
    surface: number;
}

export const DEFAULT_TAB_BAR_OPACITY: TabBarOpacity = {
    activeContent: 1,
    inactiveContent: 1,
    selectedSurface: 1,
    surface: 1,
};

export interface PillJellyConfig {
    pressedScale: number;
    snapOnPointerDown: boolean;
    frameConfig: PillJellyFrameConfig;
}

const PILL_JELLY = {
    pressedScale: 1.3,
    snapOnPointerDown: true,
    frameConfig: {
        releaseDistanceFraction: 0.025,
        springs: {
            panel: { stiffness: 300, dampingRatio: 1 },
            press: { stiffness: 1_000, dampingRatio: 1 },
            scaleX: { stiffness: 250, dampingRatio: 0.6 },
            scaleY: { stiffness: 250, dampingRatio: 0.7 },
            value: { stiffness: 1_000, dampingRatio: 1 },
            velocity: { stiffness: 300, dampingRatio: 0.5 },
        },
    },
} as const satisfies PillJellyConfig;

export interface DistortionConfig {
    pressedScale: number;
    touchFeedback: {
        middleOpacityRatio: number;
        opacity: number;
        radius: number;
        scale: number;
    };
    spring: {
        damping: number;
        mass: number;
        stiffness: number;
    };
    verticalDrag: {
        distortion: number;
        distanceForMaxDistortion: number;
        follow: number;
        rubberBand: number;
    };
}

const DISTORTION = {
    pressedScale: 1.025,
    touchFeedback: {
        middleOpacityRatio: 0.43,
        opacity: 0.15,
        radius: 150,
        scale: 2,
    },
    spring: {
        damping: 18,
        mass: 0.9,
        stiffness: 240,
    },
    verticalDrag: {
        distortion: 0.08,
        distanceForMaxDistortion: 700,
        follow: 0.25,
        rubberBand: 0.28 / 2,
    },
} as const satisfies DistortionConfig;

export interface TabBarConfig {
    distortion: DistortionConfig;
    layout: TabBarLayoutConfig;
    pillJelly: PillJellyConfig;
}

export type DeepPartial<T> = {
    [Key in keyof T]?: T[Key] extends object ? DeepPartial<T[Key]> : T[Key];
};

type SpringOverrides = DeepPartial<PillJellyConfig["frameConfig"]["springs"]>;

const resolveSprings = (springs?: SpringOverrides) => ({
    panel: { ...PILL_JELLY.frameConfig.springs.panel, ...springs?.panel },
    press: { ...PILL_JELLY.frameConfig.springs.press, ...springs?.press },
    scaleX: { ...PILL_JELLY.frameConfig.springs.scaleX, ...springs?.scaleX },
    scaleY: { ...PILL_JELLY.frameConfig.springs.scaleY, ...springs?.scaleY },
    value: { ...PILL_JELLY.frameConfig.springs.value, ...springs?.value },
    velocity: { ...PILL_JELLY.frameConfig.springs.velocity, ...springs?.velocity },
});

const resolvePillJelly = (pillJelly?: DeepPartial<PillJellyConfig>): PillJellyConfig => ({
    ...PILL_JELLY,
    ...pillJelly,
    frameConfig: {
        ...PILL_JELLY.frameConfig,
        ...pillJelly?.frameConfig,
        springs: resolveSprings(pillJelly?.frameConfig?.springs),
    },
});

const resolveDistortion = (distortion?: DeepPartial<DistortionConfig>): DistortionConfig => ({
    ...DISTORTION,
    ...distortion,
    touchFeedback: { ...DISTORTION.touchFeedback, ...distortion?.touchFeedback },
    spring: { ...DISTORTION.spring, ...distortion?.spring },
    verticalDrag: { ...DISTORTION.verticalDrag, ...distortion?.verticalDrag },
});

export const resolveTabBarConfig = (config?: DeepPartial<TabBarConfig>): TabBarConfig => ({
    layout: { ...TABBAR_LAYOUT, ...config?.layout },
    pillJelly: resolvePillJelly(config?.pillJelly),
    distortion: resolveDistortion(config?.distortion),
});
