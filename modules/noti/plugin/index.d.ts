export type AnimationState = {
    opacity?: number;
    translateX?: `${number}rem` | `${number}%` | 0;
    translateY?: `${number}rem` | `${number}%` | 0;
    scale?: number;
    scaleX?: number;
    scaleY?: number;
    rotate?: number;
};
export type NotiAnimation = {
    from?: AnimationState;
    animate?: AnimationState;
    exit?: AnimationState;
    transition?: {
        duration?: number;
        delay?: number;
        easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | [number, number, number, number];
        repeat?: number;
        repeatReverse?: boolean;
    };
};
export type NotiPluginOptions = {
    animations?: Record<string, NotiAnimation>;
    widgets?: boolean;
    /** URL scheme the money widget's "Customize" action opens. Defaults to the app's scheme. */
    scheme?: string;
};
declare function withNoti(
    config: import('expo/config').ExpoConfig,
    options?: NotiPluginOptions
): import('expo/config').ExpoConfig;
export default withNoti;
