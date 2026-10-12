import { TrueSheet, type TrueSheetProps } from "@lodev09/react-native-true-sheet";
import { createContext, type ReactNode, type RefObject, use } from "react";
import { Platform, Text, useWindowDimensions, View } from "react-native";

import { RecedingSheet, SHEET_CORNER_RADIUS, SHEET_RECEDE_ENABLED } from "@/components/sheet-recede";
import { SheetHeaderButton } from "@/features/earnings/sheet-header-button";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";
import { useI18n } from "@/features/i18n/i18n";

const SHEET_DETENT = 0.82;
// Keep above STACKED_PARENT_PEEK_DP + STACKED_PARENT_DROP_DP in the TrueSheet patch so the parent peeks out.
const STACKED_GAP_DP = 40;
const TRANSPARENT = { backgroundColor: "transparent" };

const SheetDepth = createContext(0);

type AppSheetProps = Pick<TrueSheetProps, "children" | "footer" | "onDidDismiss"> & {
    sheetRef: RefObject<TrueSheet | null>;
    title: string;
    closeTestID: string;
    dismissible?: boolean;
    headerActions?: ReactNode;
    headerAccessory?: ReactNode;
};

export function AppSheet({
    sheetRef,
    title,
    closeTestID,
    dismissible = true,
    headerActions,
    headerAccessory,
    footer,
    onDidDismiss,
    children,
}: AppSheetProps) {
    const depth = use(SheetDepth);
    const nested = depth > 0;
    const { height } = useWindowDimensions();
    const { colors, isDark } = useEarningsTheme();
    const { t } = useI18n();

    const props: TrueSheetProps = {
        backgroundColor: Platform.OS === "ios" ? undefined : colors.canvas,
        cornerRadius: SHEET_RECEDE_ENABLED ? SHEET_CORNER_RADIUS : undefined,
        detents: [nested ? SHEET_DETENT - STACKED_GAP_DP / height : SHEET_DETENT, 1],
        initialDetentIndex: 0,
        dimmed: true,
        // A black dim hides the canvas-colored sheet in dark mode, so lift the backdrop unless the page recedes.
        dimmedColor: isDark && !SHEET_RECEDE_ENABLED ? colors.track : undefined,
        dismissible,
        draggable: dismissible,
        grabber: true,
        scrollable: true,
        presentation: "page",
        onDidDismiss,
        headerStyle: TRANSPARENT,
        footerStyle: TRANSPARENT,
        footer,
        header: (
            <View>
                <View className={`flex-row items-center gap-3 px-[22px] pt-6 ${headerAccessory ? "pb-3.5" : "pb-4"}`}>
                    <Text accessibilityRole="header" className="min-w-0 flex-1 font-sans text-[24px] font-bold tracking-[-0.65px] text-ink">
                        {title}
                    </Text>
                    {headerActions}
                    <SheetHeaderButton
                        accessibilityLabel={t("common.close")}
                        disabled={!dismissible}
                        kind="close"
                        onPress={() => {
                            appHaptics.dismiss();
                            void sheetRef.current?.dismiss().catch(() => undefined);
                        }}
                        testID={closeTestID}
                    />
                </View>
                {headerAccessory}
            </View>
        ),
        children: <SheetDepth value={depth + 1}>{children}</SheetDepth>,
    };

    // Only the outermost sheet drives the page recede; a nested one stacks on its parent sheet instead.
    return nested ? <TrueSheet ref={sheetRef} {...props} /> : <RecedingSheet ref={sheetRef} {...props} />;
}
