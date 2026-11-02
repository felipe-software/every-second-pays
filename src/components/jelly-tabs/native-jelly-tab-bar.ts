import { installOnUIRuntime, type NativeModule, requireNativeModule, requireNativeView } from "expo";
import type { SharedObject } from "expo-modules-core/types";
import type { ComponentType } from "react";
import type { NativeSyntheticEvent, ViewProps } from "react-native";
import { getUIRuntimeHolder, registerCustomSerializable, type SerializableRef } from "react-native-worklets";

export type JellyTabBarController = SharedObject & {
    __expo_shared_object_id__: number;
    activateTab(index: number): void;
    setProgress(progress: number): void;
    setProgressListener(listener: SerializableRef<(progress: number) => void>): void;
};

type JellyTabsModule = NativeModule & {
    JellyTabBarController: new () => JellyTabBarController;
};

type PackedController = { objectId: number };

type ExpoSharedObjects = typeof globalThis.expo.SharedObject;

type WorkletSharedObjects = {
    __resolveInWorklet: (objectId: number) => JellyTabBarController;
};

export type JellyTabContentStyle = {
    iconSize?: number;
    iconLabelGap?: number;
    labelFontSize?: number;
    activeLabelFontFamily?: string;
    inactiveLabelFontFamily?: string;
    activeLabelFontWeight?: number;
    inactiveLabelFontWeight?: number;
    pillOverhang?: number;
};

export type NativeJellyTabBarProps = ViewProps & {
    accentColor: number;
    activeContentColor: number;
    contentStyle?: JellyTabContentStyle;
    controller: JellyTabBarController;
    iconPaths: readonly string[];
    inactiveIconPaths: readonly string[];
    inactiveContentColor: number;
    labels: readonly string[];
    onTabPress: (event: NativeSyntheticEvent<{ index: number }>) => void;
    outlineColor: number;
    selectedIndex: number;
    surfaceColor: number;
};

installOnUIRuntime(getUIRuntimeHolder());

function hasWorkletResolver(
    sharedObjects: ExpoSharedObjects,
): sharedObjects is ExpoSharedObjects & WorkletSharedObjects {
    "worklet";
    return "__resolveInWorklet" in sharedObjects;
}

registerCustomSerializable<JellyTabBarController, PackedController>({
    name: "JellyTabBarController",
    determine: (value): value is JellyTabBarController => {
        "worklet";
        return "isJellyTabBarController" in value;
    },
    pack: ({ __expo_shared_object_id__: objectId }) => {
        "worklet";
        return { objectId };
    },
    unpack: ({ objectId }) => {
        "worklet";
        const sharedObjects = globalThis.expo.SharedObject;
        if (!hasWorkletResolver(sharedObjects)) {
            throw new Error("Expo's worklet shared object resolver is not installed");
        }
        const { __resolveInWorklet: resolveInWorklet } = sharedObjects;
        return resolveInWorklet(objectId);
    },
});

export const JellyTabs = requireNativeModule<JellyTabsModule>("JellyTabs");

export const NativeJellyTabBar: ComponentType<NativeJellyTabBarProps> = requireNativeView("JellyTabs");
