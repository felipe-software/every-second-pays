import type { ReactNode } from 'react';

export type Rem = `${number}rem` | 0;
export type Dimension = Rem | '100%' | 'auto';
export type NotificationIdentity = { id: number; tag: string | null };
export type NotificationTarget = number | NotificationIdentity;
export type NotiAnchor =
    | 'topLeft'
    | 'topCenter'
    | 'topRight'
    | 'centerLeft'
    | 'center'
    | 'centerRight'
    | 'bottomLeft'
    | 'bottomCenter'
    | 'bottomRight';

export type NotiStyle = {
    position?: 'relative' | 'absolute';
    anchor?: NotiAnchor;
    width?: Dimension;
    height?: Dimension;
    top?: Rem;
    right?: Rem;
    bottom?: Rem;
    left?: Rem;
    padding?: Rem;
    paddingHorizontal?: Rem;
    paddingVertical?: Rem;
    paddingTop?: Rem;
    paddingRight?: Rem;
    paddingBottom?: Rem;
    paddingLeft?: Rem;
    gap?: Rem;
    backgroundColor?: string;
    borderRadius?: Rem;
    opacity?: number;
    color?: string;
    fontSize?: Rem;
    fontWeight?: 'normal' | 'bold';
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'center' | 'bottom';
    justifyContent?: 'start' | 'center' | 'end';
    alignItems?: 'start' | 'center' | 'end';
    translateX?: Rem;
    translateY?: Rem;
    scale?: number;
    scaleX?: number;
    scaleY?: number;
    rotate?: number;
    elevation?: Rem;
};

export type NotiProps = {
    id?: string;
    animation?: string;
    enter?: string;
    exit?: string;
    transitionKey?: string | number;
    style?: NotiStyle;
    accessibilityLabel?: string;
    onPress?: string;
    children?: ReactNode;
};

export type ViewProps = NotiProps & { direction?: 'column' | 'row' | 'overlay' };
export type GridProps = NotiProps & { columns: number; rows?: number };
export type TextProps = NotiProps & { numberOfLines?: number };
export type ButtonProps = TextProps & { onPress: string };
export type ImageProps = Omit<NotiProps, 'children'> & {
    source: string;
    resizeMode?: 'cover' | 'contain' | 'stretch';
};
export type SpacerProps = Omit<NotiProps, 'children'>;
export type ProgressProps = Omit<NotiProps, 'children'> & {
    value: number;
    max?: number;
    indeterminate?: boolean;
    color?: string;
    trackColor?: string;
};
export type ChronometerProps = Omit<NotiProps, 'children'> & {
    base: number;
    started?: boolean;
    countDown?: boolean;
    format?: string;
};
export type ScrollViewProps = Omit<NotiProps, 'animation'> & {
    id: string;
    index?: number;
    windowSize?: number;
    itemHeight: Rem;
    autoPlay?: boolean;
    interval?: number;
};
export type ViewFlipperProps = NotiProps & {
    interval?: number;
    index?: number;
    autoPlay?: boolean;
};

export type RuntimeAnimationState = {
    opacity?: number;
    translateX?: Rem;
    translateY?: Rem;
    scale?: number;
    scaleX?: number;
    scaleY?: number;
    rotate?: number;
    backgroundColor?: string;
};
export type RuntimeTransition = {
    type?: 'timing' | 'spring';
    duration?: number;
    easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | [number, number, number, number];
    frames?: number;
    repeatReverse?: boolean;
    damping?: number;
    stiffness?: number;
    mass?: number;
};
export type LoopProps = Omit<NotiProps, 'animation' | 'enter' | 'exit'> & {
    from: RuntimeAnimationState;
    animate: RuntimeAnimationState | RuntimeAnimationState[];
    transition?: RuntimeTransition;
    children: ReactNode;
};
export type AnimatePresenceProps = Omit<NotiProps, 'animation'> & {
    enter?: string;
    exit?: string;
};

export type NotificationScene = {
    collapsed: ReactNode;
    expanded?: ReactNode;
    headsUp?: ReactNode;
};
export type NotificationAction = {
    id: string;
    title: string;
    onPress: string;
};
export type CreateNotificationOptions = NotificationScene & {
    channelId?: string;
    channelName?: string;
    importance?: 'low' | 'default' | 'high';
    title: string;
    body?: string;
    smallIcon?: string;
    ongoing?: boolean;
    actions?: NotificationAction[];
    id?: number;
    tag?: string | null;
};
export type NotificationUpdate = Partial<NotificationScene> & {
    title?: string;
    body?: string;
    actions?: NotificationAction[];
};
export type ActiveNotification = NotificationIdentity & {
    title: string;
    body: string;
    channelId: string;
    managed: boolean;
};
export type NotiAction = NotificationIdentity & { action: string; nodeId: string };
export type WidgetAction = { widgetId: number; action: string; nodeId: string };

export type SerializedRuntimeFrame = Record<string, string | number>;
export type SerializedNode = {
    type:
        | 'view'
        | 'grid'
        | 'text'
        | 'button'
        | 'image'
        | 'spacer'
        | 'progress'
        | 'chronometer'
        | 'scroll'
        | 'flipper'
        | 'loop'
        | 'presence'
        | 'crossfade';
    key: string;
    id?: string;
    animation?: string;
    enter?: string;
    exit?: string;
    transitionKey?: string | number;
    style: Record<string, string | number>;
    accessibilityLabel?: string;
    onPress?: string;
    direction?: string;
    columns?: number;
    rows?: number;
    text?: string;
    numberOfLines?: number;
    source?: string;
    resizeMode?: string;
    value?: number;
    max?: number;
    indeterminate?: boolean;
    color?: string;
    trackColor?: string;
    base?: number;
    started?: boolean;
    countDown?: boolean;
    format?: string;
    index?: number;
    windowSize?: number;
    itemHeight?: number;
    interval?: number;
    autoPlay?: boolean;
    runtimeFrames?: SerializedRuntimeFrame[];
    children: SerializedNode[];
};

/** Live money widget. */
export type MoneyWidgetTemplate = 'hero' | 'ledger' | 'minimal';
export type MoneyWidgetEffect = 'none' | 'rain' | 'stream' | 'fountain' | 'orbit';
export type MoneyWidgetMotion = 'roll' | 'drop' | 'flip' | 'blur' | 'slot';
export type MoneyWidgetIntensity = 'calm' | 'lively' | 'wild';
export type MoneyWidgetPeriod = 'app' | 'today' | 'week' | 'month' | 'year';
export type MoneyWidgetPalette = 'app' | 'orange' | 'green' | 'blue' | 'rose' | 'lavender';
export type MoneyWidgetTheme = 'app' | 'system' | 'light' | 'dark';
export type MoneyWidgetBackground = 'glow' | 'solid' | 'glass';
export type MoneyWidgetConfig = {
    template: MoneyWidgetTemplate;
    effect: MoneyWidgetEffect;
    motion: MoneyWidgetMotion;
    intensity: MoneyWidgetIntensity;
    period: MoneyWidgetPeriod;
    palette: MoneyWidgetPalette;
    theme: MoneyWidgetTheme;
    background: MoneyWidgetBackground;
    cents: boolean;
    caption: boolean;
};
/** `[time in ms, total in cents at that time, cents per millisecond after it]` */
export type MoneyBreakpoint = [number, number, number];
export type MoneyPaletteColors = {
    canvas: string;
    row: string;
    ink: string;
    muted: string;
    accent: string;
    accentDeep: string;
};
export type MoneyWidgetData = {
    appPeriod: 'today' | 'week' | 'month' | 'year';
    hasSources: boolean;
    schedules: Record<'today' | 'week' | 'month' | 'year', MoneyBreakpoint[]>;
    appearance: { mode: 'system' | 'light' | 'dark'; palette: string };
    palettes: Record<string, { light: MoneyPaletteColors; dark: MoneyPaletteColors }>;
    format: { currency: string; decimal: string; group: string; groupSize: number };
    /** Period names plus `rate` ("{{amount}} an hour"), `idle`, and `empty`. */
    labels: Record<string, string>;
};
export type MoneyWidget = { id: number; config: MoneyWidgetConfig; width: number; height: number };

