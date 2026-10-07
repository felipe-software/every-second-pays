import { NativeModule, requireNativeView, requireOptionalNativeModule } from 'expo';
import { createElement, type ComponentType, type ReactNode } from 'react';
import { PermissionsAndroid, Platform, type ViewProps } from 'react-native';
import { NotiPrimitives } from './components';
import { serializeScene } from './serialize';
import type {
    ActiveNotification,
    CreateNotificationOptions,
    MoneyWidget,
    MoneyWidgetConfig,
    MoneyWidgetData,
    NotiAction,
    NotificationIdentity,
    NotificationTarget,
    NotificationUpdate,
    WidgetAction,
} from './types';

export type * from './types';
export type { NotiAnimation, AnimationState, NotiPluginOptions } from '../plugin';

type Events = {
    onAction: (event: NotiAction) => void;
    onWidgetAction: (event: WidgetAction) => void;
    onWidgetPinned: (event: { widgetId: number }) => void;
    onMoneyWidgetsChanged: () => void;
};
declare class NotificationMotionModule extends NativeModule<Events> {
    create(options: string): Promise<NotificationIdentity>;
    update(identity: NotificationIdentity, update: string): Promise<void>;
    adopt(identity: NotificationIdentity): Promise<NotificationIdentity>;
    listActive(): Promise<ActiveNotification[]>;
    dismiss(identity: NotificationIdentity): Promise<void>;
    scrollTo(identity: NotificationIdentity, nodeId: string, index: number): Promise<void>;
    isWidgetPinningSupported(): Promise<boolean>;
    requestPinWidget(scene: string): Promise<boolean>;
    listWidgets(): Promise<number[]>;
    updateWidget(widgetId: number, scene: string): Promise<void>;
    updateAllWidgets(scene: string): Promise<void>;
    isMoneyWidgetSupported(): Promise<boolean>;
    isMoneyWidgetPinningSupported(): Promise<boolean>;
    setMoneyWidgetData(data: string): Promise<void>;
    setMoneyWidgetDefaultConfig(config: string): Promise<void>;
    requestPinMoneyWidget(config: string): Promise<boolean>;
    listMoneyWidgets(): Promise<{ id: number; config: string; width: number; height: number }[]>;
    updateMoneyWidget(widgetId: number, config: string): Promise<void>;
}

const supported = () => Platform.OS === 'android' && Number(Platform.Version) >= 31;

function native(): NotificationMotionModule {
    if (!supported()) throw new Error('Noti requires Android 12 / API 31 or newer.');
    const module = requireOptionalNativeModule<NotificationMotionModule>('NotificationMotion');
    if (!module) throw new Error('Noti is not linked. Rebuild the Expo development client.');
    return module;
}

function identity(target: NotificationTarget): NotificationIdentity {
    const result = typeof target === 'number' ? { id: target, tag: null } : target;
    if (
        !Number.isInteger(result.id) ||
        result.id < -2147483648 ||
        result.id > 2147483647 ||
        (result.tag !== null && typeof result.tag !== 'string')
    )
        throw new Error('Invalid Android notification identity.');
    return { id: result.id, tag: result.tag };
}

function serializeUpdate(update: NotificationUpdate): string {
    const actions = update.actions?.map((item) => {
        if (
            typeof item.id !== 'string' ||
            !/^[a-zA-Z0-9._-]{1,64}$/.test(item.id) ||
            typeof item.onPress !== 'string' ||
            !/^[a-zA-Z0-9._-]{1,64}$/.test(item.onPress) ||
            typeof item.title !== 'string' ||
            item.title.length < 1 ||
            item.title.length > 40
        ) {
            throw new Error(
                'Notification actions require a 1–64 character id/onPress and a 1–40 character title.'
            );
        }
        return item;
    });
    if (actions && actions.length > 3)
        throw new Error('Android notifications support at most three actions.');
    return JSON.stringify({
        ...update,
        actions,
        collapsed: update.collapsed === undefined ? undefined : serializeScene(update.collapsed),
        expanded:
            update.expanded === undefined
                ? undefined
                : update.expanded === null
                  ? null
                  : serializeScene(update.expanded),
        headsUp:
            update.headsUp === undefined
                ? undefined
                : update.headsUp === null
                  ? null
                  : serializeScene(update.headsUp),
    });
}

function widgetId(id: number): number {
    if (!Number.isInteger(id) || id <= 0 || id > 2147483647)
        throw new Error('Invalid Android widget id.');
    return id;
}

const widgets = {
    async isPinningSupported(): Promise<boolean> {
        if (!supported()) return false;
        return native().isWidgetPinningSupported();
    },
    async requestPin(scene: ReactNode): Promise<boolean> {
        return native().requestPinWidget(JSON.stringify(serializeScene(scene)));
    },
    async list(): Promise<number[]> {
        return native().listWidgets();
    },
    async update(id: number, scene: ReactNode): Promise<void> {
        await native().updateWidget(widgetId(id), JSON.stringify(serializeScene(scene)));
    },
    async updateAll(scene: ReactNode): Promise<void> {
        await native().updateAllWidgets(JSON.stringify(serializeScene(scene)));
    },
    addActionListener(listener: (event: WidgetAction) => void) {
        return native().addListener('onWidgetAction', listener);
    },
    addPinnedListener(listener: (event: { widgetId: number }) => void) {
        return native().addListener('onWidgetPinned', listener);
    },
};

/**
 * The live money widget. The app publishes an earnings schedule and each widget's config; the
 * native side renders animated timelines from them and keeps re-syncing without JavaScript.
 */
const moneyWidgets = {
    /** Android 12+ with the widget provider installed. */
    async isSupported(): Promise<boolean> {
        if (!supported()) return false;
        return native().isMoneyWidgetSupported();
    },
    async isPinningSupported(): Promise<boolean> {
        if (!supported()) return false;
        return native().isMoneyWidgetPinningSupported();
    },
    async setData(data: MoneyWidgetData): Promise<void> {
        await native().setMoneyWidgetData(JSON.stringify(data));
    },
    /** The config for widgets added from the launcher's widget picker. */
    async setDefaultConfig(config: MoneyWidgetConfig): Promise<void> {
        await native().setMoneyWidgetDefaultConfig(JSON.stringify(config));
    },
    /** Opens the launcher's pin dialog; the widget it adds uses `config`. */
    async requestPin(config: MoneyWidgetConfig): Promise<boolean> {
        return native().requestPinMoneyWidget(JSON.stringify(config));
    },
    async list(): Promise<MoneyWidget[]> {
        const items = await native().listMoneyWidgets();
        return items.map((item) => ({ ...item, config: JSON.parse(item.config) as MoneyWidgetConfig }));
    },
    async update(id: number, config: MoneyWidgetConfig): Promise<void> {
        await native().updateMoneyWidget(widgetId(id), JSON.stringify(config));
    },
    /** Fires when a widget is added, removed, or restored. */
    addChangeListener(listener: () => void) {
        return native().addListener('onMoneyWidgetsChanged', listener);
    },
};

export type MoneyWidgetPreviewProps = ViewProps & {
    config: MoneyWidgetConfig;
    /** Bump to re-render after publishing new data. */
    revision?: number;
};

let previewComponent: ComponentType<ViewProps & { config: string; revision: number }> | null = null;

/** The real widget, rendered live by the same native code the launcher uses. Android 12+. */
export function MoneyWidgetPreview({ config, revision = 0, ...props }: MoneyWidgetPreviewProps) {
    if (!supported()) return null;
    previewComponent ??= requireNativeView('NotificationMotion');
    return createElement(previewComponent, { ...props, config: JSON.stringify(config), revision });
}

const lifecycle = {
    async requestPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') return false;
        if (Number(Platform.Version) < 33) return true;
        return (
            (await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            )) === PermissionsAndroid.RESULTS.GRANTED
        );
    },
    async create(options: CreateNotificationOptions): Promise<number> {
        const payload = JSON.parse(serializeUpdate(options));
        return (await native().create(JSON.stringify({ ...options, ...payload }))).id;
    },
    async update(target: NotificationTarget, update: NotificationUpdate): Promise<void> {
        await native().update(identity(target), serializeUpdate(update));
    },
    async adopt(target: NotificationTarget): Promise<NotificationIdentity> {
        return native().adopt(identity(target));
    },
    async listActive(): Promise<ActiveNotification[]> {
        return native().listActive();
    },
    async dismiss(target: NotificationTarget): Promise<void> {
        await native().dismiss(identity(target));
    },
    async scrollTo(target: NotificationTarget, nodeId: string, index: number): Promise<void> {
        if (!Number.isInteger(index) || index < 0)
            throw new Error('Scroll index must be a non-negative integer.');
        await native().scrollTo(identity(target), nodeId, index);
    },
    addActionListener(listener: (event: NotiAction) => void) {
        return native().addListener('onAction', listener);
    },
};

export const Noti = Object.assign(NotiPrimitives, lifecycle, { widgets, moneyWidgets });
