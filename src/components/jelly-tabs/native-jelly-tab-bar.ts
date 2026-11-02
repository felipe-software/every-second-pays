import { installOnUIRuntime, type NativeModule, requireNativeModule, requireNativeView } from "expo";
import type { SharedObject } from "expo-modules-core/types";
import type { ComponentType } from "react";
import type { NativeSyntheticEvent, ViewProps } from "react-native";
import { getUIRuntimeHolder, registerCustomSerializable, type SerializableRef } from "react-native-worklets";

export type JellyTabBarController = SharedObject & {
    activateTab(index: number): void;
    setProgress(progress: number): void;
    setProgressListener(listener: SerializableRef<(progress: number) => void>): void;
};

type JellyTabsModule = NativeModule & {
    JellyTabBarController: new () => JellyTabBarController;
};

type PackedController = { objectId: number };

type BrandedController = JellyTabBarController & {
    __expo_shared_object_id__: number;
    __jelly_tab_bar_controller__: true;
};

export type NativeJellyTabBarProps = ViewProps & {
    accentColor: number;
    activeContentColor: number;
    controller: JellyTabBarController;
    iconPaths: readonly string[];
    inactiveContentColor: number;
    labels: readonly string[];
    onTabPress: (event: NativeSyntheticEvent<{ index: number }>) => void;
    outlineColor: number;
    selectedIndex: number;
    surfaceColor: number;
};

installOnUIRuntime(getUIRuntimeHolder());

registerCustomSerializable<JellyTabBarController, PackedController>({
    name: "JellyTabBarController",
    determine: (value): value is JellyTabBarController => {
        "worklet";
        return (value as Partial<BrandedController>).__jelly_tab_bar_controller__ === true;
    },
    pack: (value) => {
        "worklet";
        return { objectId: (value as BrandedController).__expo_shared_object_id__ };
    },
    unpack: ({ objectId }) => {
        "worklet";
        return (globalThis as unknown as JellyWorkletGlobal).expo.SharedObject.__resolveInWorklet(objectId);
    },
});

type JellyWorkletGlobal = {
    expo: { SharedObject: { __resolveInWorklet(objectId: number): JellyTabBarController } };
};

export const JellyTabs = requireNativeModule<JellyTabsModule>("JellyTabs");

export const NativeJellyTabBar: ComponentType<NativeJellyTabBarProps> = requireNativeView("JellyTabs");
