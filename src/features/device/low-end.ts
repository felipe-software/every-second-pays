import * as Device from "expo-device";
import { useEffect } from "react";
import { Platform } from "react-native";

import { useDeveloperStore } from "@/features/developer/store";

// A Galaxy A13 reports 3–4 GB; phones with big CPU cores ship with 6 GB or more.
const LOW_END_MEMORY = 4 * 1024 ** 3;

export const detectedLowEnd =
    Platform.OS === "android" && Device.totalMemory !== null && Device.totalMemory <= LOW_END_MEMORY;

export function useLowEndDevice() {
    const forced = useDeveloperStore((state) => state.forceLowEnd);
    useEffect(() => {
        void useDeveloperStore.getState().load();
    }, []);
    return detectedLowEnd || forced;
}
