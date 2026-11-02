import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/elevated/primary-button";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import { EmptySourcesMessage } from "./empty-sources";

export function EarningsListStatus({
    empty,
    loadError,
    onRetry,
}: {
    empty: boolean;
    loadError: boolean;
    onRetry: () => Promise<void>;
}) {
    const { t } = useI18n();

    if (loadError) {
        return (
            <View className="gap-3 py-4">
                <Text className="text-center font-sans text-[14px] text-muted">{t("home.loadError")}</Text>
                <PrimaryButton
                    label={t("common.tryAgain")}
                    onPress={() => {
                        appHaptics.primaryAction();
                        void onRetry();
                    }}
                />
            </View>
        );
    }
    if (empty) return <EmptySourcesMessage />;
    return null;
}
