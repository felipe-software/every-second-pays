import { memo } from "react";
import { StyleSheet, View } from "react-native";

import type { JellyTabItem } from "./jelly-tab-bar";

const ACTIVATE_ACTION = [{ name: "activate" }] as const;
const TRACK_INSET = 4;

type AccessibilityTabsRowProps = {
    items: readonly JellyTabItem[];
    pillOverhang: number;
    onActivate: (index: number) => void;
    selectedIndex: number | null;
};

export const AccessibilityTabsRow = memo(function AccessibilityTabsRow({
    items,
    pillOverhang,
    onActivate,
    selectedIndex,
}: AccessibilityTabsRowProps) {
    return (
        <View pointerEvents="box-none" style={[styles.row, { paddingHorizontal: TRACK_INSET + pillOverhang / 2 }]}>
            {items.map((item, index) => (
                <View
                    accessibilityActions={ACTIVATE_ACTION}
                    accessibilityLabel={item.accessibilityLabel}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: selectedIndex === index }}
                    accessible
                    key={item.key}
                    pointerEvents="none"
                    onAccessibilityAction={(event) => {
                        if (event.nativeEvent.actionName === "activate") onActivate(index);
                    }}
                    style={styles.tab}
                    testID={item.testID}
                />
            ))}
        </View>
    );
});

const styles = StyleSheet.create({
    row: {
        ...StyleSheet.absoluteFill,
        flexDirection: "row",
    },
    tab: {
        flex: 1,
    },
});
