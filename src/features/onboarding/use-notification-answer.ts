import { useEffect, useState } from "react";

import { appHaptics } from "@/features/haptics/haptics";

import { notificationsAllowed, rememberNotificationsAsked, requestNotifications } from "./notification-permission";
import type { NotificationAnswer } from "./notifications-step";
import { HAS_NOTIFICATIONS } from "./onboarding-pages";

export function useNotificationAnswer() {
    const [notifications, setNotifications] = useState<NotificationAnswer>("ask");
    const [askingSystem, setAskingSystem] = useState(false);

    useEffect(() => {
        if (!HAS_NOTIFICATIONS) return;
        void notificationsAllowed().then((allowed) => {
            if (allowed) setNotifications("allowed");
        });
    }, []);

    const askForNotifications = async () => {
        setAskingSystem(true);
        const allowed = await requestNotifications();
        setAskingSystem(false);
        setNotifications(allowed ? "allowed" : "declined");
    };

    const declineNotifications = () => {
        appHaptics.dismiss();
        rememberNotificationsAsked();
        setNotifications("declined");
    };

    return { notifications, askingSystem, askForNotifications, declineNotifications };
}
