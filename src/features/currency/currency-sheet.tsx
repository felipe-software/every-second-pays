import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useRef } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SheetHeaderButton } from "@/features/earnings/sheet-header-button";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

import type { Currency } from "./currencies";
import { CurrencyList } from "./currency-list";

export function CurrencySheet({
    value,
    onChange,
    onDismiss,
}: {
    value: Currency;
    onChange: (value: Currency) => void;
    onDismiss: () => void;
}) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useEarningsTheme();
    const { t } = useI18n();
    const sheetRef = useRef<TrueSheet>(null);
    const dismiss = () => void sheetRef.current?.dismiss().catch(() => undefined);

    return (
        <TrueSheet
            ref={sheetRef}
            backgroundColor={Platform.OS === "ios" ? undefined : colors.canvas}
            detents={[0.88, 1]}
            initialDetentIndex={0}
            dimmed
            dimmedColor={isDark ? colors.track : undefined}
            grabber
            scrollable
            onDidDismiss={onDismiss}
            headerStyle={{ backgroundColor: "transparent" }}
            header={
                <View className="flex-row items-center gap-3 px-[22px] pt-6 pb-4">
                    <Text className="min-w-0 flex-1 font-sans text-[24px] font-bold tracking-[-0.65px] text-ink">
                        {t("payment.currency")}
                    </Text>
                    <SheetHeaderButton
                        accessibilityLabel={t("common.close")}
                        kind="close"
                        onPress={() => {
                            appHaptics.dismiss();
                            dismiss();
                        }}
                        testID="close-currency-sheet"
                    />
                </View>
            }
        >
            <ScrollView
                className="flex-1"
                style={{ backgroundColor: "transparent" }}
                contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 4, paddingBottom: insets.bottom + 32 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <CurrencyList
                    value={value}
                    surface="fill"
                    live
                    onChange={onChange}
                    onPick={dismiss}
                />
            </ScrollView>
        </TrueSheet>
    );
}
