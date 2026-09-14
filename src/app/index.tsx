import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EarningsBackground } from "@/features/earnings/earnings-background";
import { EarningsHeader } from "@/features/earnings/earnings-header";
import { EmptySourcesCallout, EmptySourcesMessage } from "@/features/earnings/empty-sources";
import { type PaymentDraft, currentShift, earnedToday, ratePerSecond } from "@/features/earnings/model";
import { usePaymentComposerStore } from "@/features/earnings/payment-composer-store";
import { PaymentSheet, PrimaryButton } from "@/features/earnings/payment-sheet";
import { SourceRow } from "@/features/earnings/source-row";
import { useEarningsStore } from "@/features/earnings/store";
import { useEarningsTheme } from "@/features/earnings/theme";
import { useI18n } from "@/features/i18n/i18n";

function useLiveClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 200);
        return () => clearInterval(timer);
    }, []);

    return now;
}

export default function EarningsScreen() {
    const insets = useSafeAreaInsets();
    const { isDark } = useEarningsTheme();
    const { t } = useI18n();
    const now = useLiveClock();
    const sources = useEarningsStore((state) => state.sources);
    const ready = useEarningsStore((state) => state.ready);
    const saving = useEarningsStore((state) => state.saving);
    const loadError = useEarningsStore((state) => state.loadError);
    const load = useEarningsStore((state) => state.load);
    const save = useEarningsStore((state) => state.save);
    const remove = useEarningsStore((state) => state.remove);
    const newSourceRequest = usePaymentComposerStore((state) => state.newSourceRequest);
    const handledNewSourceRequest = useRef(0);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        void load();
    }, [load]);

    const editingSource = sources.find((source) => source.id === editingId);
    const total = useMemo(
        () => sources.reduce((sum, source) => sum + earnedToday(source, now), 0),
        [now, sources],
    );
    const liveRate = useMemo(
        () => sources.reduce((sum, source) => sum + (currentShift(source, now) ? ratePerSecond(source) : 0), 0),
        [now, sources],
    );

    const openNewSource = () => {
        setEditingId(null);
        setSheetOpen(true);
    };

    useEffect(() => {
        if (newSourceRequest <= handledNewSourceRequest.current) return;
        handledNewSourceRequest.current = newSourceRequest;
        openNewSource();
    }, [newSourceRequest]);

    const closeSheet = () => {
        if (useEarningsStore.getState().saving) return;
        setSheetOpen(false);
        setEditingId(null);
    };

    const saveSource = async (draft: PaymentDraft, id?: number) => {
        if (useEarningsStore.getState().saving) return;
        try {
            await save(draft, id);
        } catch {
            Alert.alert(t("home.saveErrorTitle"), t("home.saveErrorBody"));
            throw new Error("Could not save payment source");
        }
    };

    const removeSource = async (id: number) => {
        if (useEarningsStore.getState().saving) return;
        try {
            await remove(id);
        } catch {
            Alert.alert(t("home.deleteErrorTitle"), t("home.deleteErrorBody"));
            throw new Error("Could not delete payment source");
        }
    };

    return (
        <View className="flex-1 items-center bg-canvas">
            <StatusBar style={isDark ? "light" : "dark"} />
            <View className="relative w-full max-w-[430px] flex-1 overflow-hidden bg-canvas">
                <EarningsBackground />

                <View className="flex-1" style={{ paddingTop: insets.top }}>
                    <EarningsHeader total={total} liveRate={liveRate} ready={ready} loadError={loadError} />

                    <ScrollView
                        className="mt-14 flex-1 px-[22px]"
                        contentContainerStyle={{ gap: 10, paddingBottom: 32 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {loadError ? (
                            <View className="gap-3 py-4">
                                <Text className="text-center font-sans text-[14px] text-muted">{t("home.loadError")}</Text>
                                <PrimaryButton label={t("common.tryAgain")} onPress={() => void load()} />
                            </View>
                        ) : ready && sources.length === 0 ? (
                            <EmptySourcesMessage />
                        ) : null}
                        {sources.map((source) => (
                            <SourceRow
                                key={source.id}
                                source={source}
                                now={now}
                                onPress={() => {
                                    setEditingId(source.id);
                                    setSheetOpen(true);
                                }}
                            />
                        ))}
                    </ScrollView>

                    {ready && sources.length === 0 && !loadError && !sheetOpen ? (
                        <EmptySourcesCallout bottomInset={insets.bottom} />
                    ) : null}
                </View>

                {sheetOpen ? (
                    <PaymentSheet
                        source={editingSource}
                        now={now}
                        saving={saving}
                        onDismiss={closeSheet}
                        onDelete={removeSource}
                        onSave={saveSource}
                    />
                ) : null}
            </View>
        </View>
    );
}
