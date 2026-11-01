import * as BackgroundTask from "expo-background-task";
import { Text, View } from "react-native";
import { Noti } from "react-native-noti";

import { RaisedPressable } from "@/components/elevated/raised";
import { useAppearanceStore } from "@/features/appearance/store";
import { useCurrencyStore } from "@/features/currency/store";
import { useI18n } from "@/features/i18n/i18n";

import { billChannels, buildBillNotification } from "./content";
import { EMPTY_STATE, MONTH_MARKS, type RoutineCandidate, YEAR_MARKS } from "./routine";
import { updateState } from "./storage";
import { useNotificationStore } from "./store";

const OCTOBER = new Date(2026, 9, 1).getTime();
const TASK_DELAY = 4_000;
const progress = (mark: number, from: number, amount: number): RoutineCandidate => ({
    kind: "progress",
    scope: "month",
    key: `preview:progress:${mark}`,
    start: OCTOBER,
    mark,
    from,
    marks: MONTH_MARKS,
    amount,
    goal: 4000,
});

const PREVIEWS: { id: string; label: string; candidate: RoutineCandidate }[] = [
    { id: "25", label: "25%", candidate: progress(25, 0, 1006) },
    { id: "50", label: "50%", candidate: progress(50, 25, 2012) },
    { id: "90", label: "90%", candidate: progress(90, 50, 3608) },
    { id: "100", label: "100%", candidate: progress(100, 0, 4000) },
    { id: "week", label: "Week", candidate: { kind: "week", key: "preview:week", start: OCTOBER, days: [1, 2, 3, 4, 5], amount: 923, goal: 923 } },
    {
        id: "decile",
        label: "Year 40%",
        candidate: { kind: "progress", scope: "year", key: "preview:decile", start: new Date(2026, 0, 1).getTime(), mark: 40, from: 30, marks: YEAR_MARKS, amount: 19_200, goal: 48_000 },
    },
    { id: "year", label: "Year", candidate: { kind: "year", key: "preview:year", year: 2026, amount: 48_000, goal: 48_000 } },
    { id: "meter", label: "Meter", candidate: { kind: "meter", key: "preview:meter", since: Date.now() - 14 * 86_400_000, amount: 2310, goal: 2310 } },
];

export function DevNotificationControls() {
    const { t, locale } = useI18n();
    const currency = useCurrencyStore((state) => state.main);
    const appearance = useAppearanceStore((state) => state.appearance);
    const showAmounts = useNotificationStore((state) => state.settings.showAmounts);

    const preview = async (candidate: RoutineCandidate) => {
        await Noti.requestPermission();
        await Noti.bills.ensureChannels(billChannels(t));
        await Noti.bills.post(buildBillNotification(candidate, { t, locale, currency, showAmounts, appearance }));
    };

    return (
        <View className="mt-8">
            <Text className="mb-3 ml-1 font-sans text-[13px] font-semibold text-muted">{t("settings.developer")}</Text>
            <View className="flex-row flex-wrap gap-2 rounded-[20px] bg-row p-3">
                {PREVIEWS.map(({ id, label, candidate }) => (
                    <RaisedPressable
                        key={id}
                        testID={`notification-preview-${id}`}
                        accessibilityRole="button"
                        onPress={() => setTimeout(() => void preview(candidate), 2000)}
                        surface="canvas"
                        depth={4}
                        radius={15}
                        className="h-11 items-center justify-center px-4"
                    >
                        <Text className="font-sans text-[14px] font-semibold text-ink">{label}</Text>
                    </RaisedPressable>
                ))}
                <RaisedPressable
                    testID="notification-reset"
                    accessibilityRole="button"
                    onPress={() => void updateState((state) => ({ ...EMPTY_STATE, lastOpenedAt: state.lastOpenedAt, handled: state.handled }))}
                    surface="canvas"
                    depth={4}
                    radius={15}
                    className="h-11 items-center justify-center px-4"
                >
                    <Text className="font-sans text-[14px] font-semibold text-ink">Reset sent</Text>
                </RaisedPressable>
                <RaisedPressable
                    testID="notification-run-task"
                    accessibilityRole="button"
                    onPress={() => setTimeout(() => void BackgroundTask.triggerTaskWorkerForTestingAsync(), TASK_DELAY)}
                    surface="accent"
                    depth={4}
                    radius={15}
                    className="h-11 items-center justify-center px-4"
                >
                    <Text className="font-sans text-[14px] font-semibold text-ink">Run task in 4s</Text>
                </RaisedPressable>
            </View>
        </View>
    );
}
