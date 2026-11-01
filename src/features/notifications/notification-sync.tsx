import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, AppState, Platform } from "react-native";
import { Noti } from "react-native-noti";

import { toMainCurrency } from "@/features/currency/rates";
import { useCurrencyStore } from "@/features/currency/store";
import { PERIODS } from "@/features/earnings/model";
import { usePaymentComposerStore } from "@/features/earnings/payment-composer-store";
import { usePeriodStore } from "@/features/earnings/period-store";
import { useEarningsStore } from "@/features/earnings/store";
import { useI18n } from "@/features/i18n/i18n";
import { useOnboardingStore } from "@/features/onboarding/store";

import { registerRoutineTask } from "./background-task";
import { ADD_SOURCE_TAP, billChannels } from "./content";
import { markCrossedHandled } from "./routine";
import { applyPendingFeedback } from "./runner";
import { markPermissionAsked, updateState, wasPermissionAsked } from "./storage";
import { useNotificationStore } from "./store";

const ASK_DELAY = 1_600;

function openTappedNotification(goHome: boolean) {
    void Noti.bills.takeOpenedPeriod().then((opened) => {
        const period = PERIODS.find((item) => item === opened);
        if (period) usePeriodStore.getState().peek(period);
        else if (opened === ADD_SOURCE_TAP) usePaymentComposerStore.getState().requestNewSource();
        else return;
        if (goHome) router.navigate("/");
    }).catch(() => {});
}

function AndroidNotificationSync() {
    const { t, firstDayOfWeek } = useI18n();
    const sources = useEarningsStore((state) => state.sources);
    const ready = useEarningsStore((state) => state.ready);
    const period = usePeriodStore((state) => state.saved);
    const onboarded = useOnboardingStore((state) => state.status === "done");
    const baselined = useRef(false);

    const hasSources = sources.length > 0;

    useEffect(() => {
        void Noti.bills.ensureChannels(billChannels(t)).catch(() => {});
    }, [t]);

    useEffect(() => {
        void registerRoutineTask().catch(() => {});
        void useEarningsStore.getState().load();
        void useNotificationStore.getState().load();
        const refreshFeedback = () => {
            void applyPendingFeedback().then((settings) => {
                if (settings) useNotificationStore.setState({ settings });
            }).catch(() => {});
        };
        const markOpened = () => updateState((state) => ({ ...state, lastOpenedAt: Date.now() })).catch(() => {});
        refreshFeedback();
        openTappedNotification(false);
        const appState = AppState.addEventListener("change", (state) => {
            if (state !== "active") return;
            void markOpened();
            refreshFeedback();
            openTappedNotification(true);
        });
        const feedback = Noti.bills.addFeedbackListener(refreshFeedback);
        return () => {
            appState.remove();
            feedback.remove();
        };
    }, []);

    useEffect(() => {
        if (!ready) return;
        const firstPass = !baselined.current;
        baselined.current = true;
        void updateState((state) => {
            const now = new Date();
            const fresh = state.lastOpenedAt == null;
            const next = { ...state, lastOpenedAt: firstPass ? now.getTime() : state.lastOpenedAt };
            if (firstPass && !fresh) return next;
            const { main, rates } = useCurrencyStore.getState();
            return markCrossedHandled(next, toMainCurrency(sources, main, rates).converted, period, now, firstDayOfWeek);
        }).catch(() => {});
    }, [firstDayOfWeek, period, ready, sources]);

    useEffect(() => {
        if (!ready || !onboarded) return;
        void updateState((state) => ({
            ...state,
            onboardedAt: state.onboardedAt ?? Date.now(),
            setupSettled: state.setupSettled || hasSources,
        })).catch(() => {});
    }, [hasSources, onboarded, ready]);

    useEffect(() => {
        if (!ready || !onboarded) return;
        let cancelled = false;
        const timer = setTimeout(() => {
            void (async () => {
                if (cancelled || (await wasPermissionAsked())) return;
                if (await Noti.bills.areEnabled()) return;
                await markPermissionAsked();
                Alert.alert(t("notifications.ask.title"), t("notifications.ask.body"), [
                    { text: t("notifications.ask.no"), style: "cancel" },
                    { text: t("notifications.ask.yes"), onPress: () => void Noti.requestPermission() },
                ]);
            })().catch(() => {});
        }, ASK_DELAY);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [onboarded, ready, t]);

    return null;
}

export const NotificationSync = Platform.OS === "android" && Noti.bills.isSupported() ? AndroidNotificationSync : () => null;
