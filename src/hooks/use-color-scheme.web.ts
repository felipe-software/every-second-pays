import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// Static web rendering has no color scheme, so render light until the client hydrates.
export function useColorScheme() {
    const hasHydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

    const colorScheme = useRNColorScheme();

    if (hasHydrated) {
        return colorScheme;
    }

    return "light";
}
