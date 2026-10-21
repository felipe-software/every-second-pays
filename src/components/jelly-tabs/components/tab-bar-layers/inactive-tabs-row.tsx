import { ABSOLUTE_FILL, cloneTabs, type TabElements } from "./shared";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

export interface InactiveTabsRowProps {
    tabs: TabElements;
    trackInset: number;
}

export const InactiveTabsRow = memo(function InactiveTabsRow({
    tabs,
    trackInset,
}: InactiveTabsRowProps) {
    return (
        <View style={[styles.tabsRow, { paddingHorizontal: trackInset }]}>
            {cloneTabs(tabs, "inactive")}
        </View>
    );
});

const styles = StyleSheet.create({
    tabsRow: {
        ...ABSOLUTE_FILL,
        alignItems: "center",
        flexDirection: "row",
    },
});
