import Storage from "expo-sqlite/kv-store";
import { PermissionsAndroid, Platform } from "react-native";
import { Noti } from "react-native-noti";

// Keep in sync with the notifications feature's `ASKED_KEY`: an answer here means it doesn't ask again.
const ASKED_KEY = "notification-permission-asked";

export async function notificationsAllowed() {
    if (Platform.OS !== "android") return false;
    if (Number(Platform.Version) < 33) return true;
    try {
        return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    } catch {
        return false;
    }
}

export function rememberNotificationsAsked() {
    void Storage.setItem(ASKED_KEY, "yes").catch(() => undefined);
}

export async function requestNotifications() {
    rememberNotificationsAsked();
    try {
        return await Noti.requestPermission();
    } catch {
        return false;
    }
}
