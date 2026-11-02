import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { withAlpha } from "@/features/appearance/color";
import { useI18n } from "@/features/i18n/i18n";

import { useOnboardingTheme } from "./look";
import { rise } from "./motion";

export function CustomizePhonePreview() {
    const { colors, look } = useOnboardingTheme();
    const { t, formatMoney } = useI18n();
    const name = t(`palette.${look.palette}`);
    const mode = t(look.dark ? "settings.mode.dark" : "settings.mode.light").toLocaleLowerCase();
    const row = (top: number, active: boolean) => (
        <View style={[styles.row, { top, backgroundColor: active ? colors.active : colors.row }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.accent }]} />
            <View style={[styles.rowLine, { backgroundColor: withAlpha(colors.ink, 0.55) }]} />
            <View style={[styles.rowSubline, { backgroundColor: withAlpha(colors.muted, 0.45) }]} />
            <View style={[styles.rowChip, { backgroundColor: withAlpha(colors.accent, 0.32) }]} />
        </View>
    );

    return (
        <Animated.View style={[styles.phone, rise(80, 40, 0.92)]}>
            <View
                accessible
                accessibilityRole="image"
                accessibilityLabel={t("onboarding.customize.preview", { palette: name, mode })}
                style={[styles.screen, { backgroundColor: colors.canvas }]}
            >
                <View style={[styles.grabber, { backgroundColor: colors.track }]} />
                <Text style={[styles.kicker, { color: colors.muted }]}>{t("settings.previewToday")}</Text>
                <View style={styles.amount}>
                    <Text style={[styles.currency, { color: colors.muted }]}>$</Text>
                    <Text style={[styles.amountValue, { color: colors.ink }]}>{formatMoney(124.8)}</Text>
                </View>
                <View style={[styles.progress, { backgroundColor: colors.track }]}>
                    <View style={[styles.progressFill, { backgroundColor: colors.accent }]} />
                </View>
                {row(134, false)}
                {row(184, true)}
                <View style={[styles.tab, { backgroundColor: colors.accent }]} />
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    phone: {
        position: "absolute",
        left: 108,
        top: 92,
        width: 196,
        height: 304,
        borderRadius: 38,
        padding: 6,
        backgroundColor: "#0F1112",
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.09)",
        boxShadow: "0 30px 50px -24px rgba(0,0,0,0.42)",
    },
    screen: {
        flex: 1,
        borderRadius: 32,
        overflow: "hidden",
    },
    grabber: {
        position: "absolute",
        top: 12,
        left: "50%",
        width: 40,
        height: 5,
        marginLeft: -20,
        borderRadius: 3,
    },
    kicker: {
        position: "absolute",
        top: 44,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: "Archivo-SemiBold",
        fontSize: 9.5,
        letterSpacing: 1.2,
    },
    amount: {
        position: "absolute",
        top: 56,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "center",
    },
    currency: {
        marginTop: 6,
        marginRight: 2,
        fontFamily: "Archivo-Medium",
        fontSize: 15,
    },
    amountValue: {
        fontFamily: "Archivo-Bold",
        fontSize: 34,
        letterSpacing: -1,
        fontVariant: ["tabular-nums"],
    },
    progress: {
        position: "absolute",
        top: 110,
        left: 32,
        right: 32,
        height: 6,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        width: "64%",
        height: "100%",
        borderRadius: 3,
    },
    row: {
        position: "absolute",
        left: 14,
        right: 14,
        height: 42,
        borderRadius: 13,
    },
    rowIcon: {
        position: "absolute",
        left: 10,
        top: 11,
        width: 20,
        height: 20,
        borderRadius: 7,
    },
    rowLine: {
        position: "absolute",
        left: 40,
        top: 13,
        width: 58,
        height: 6,
        borderRadius: 3,
    },
    rowSubline: {
        position: "absolute",
        left: 40,
        top: 24,
        width: 36,
        height: 5,
        borderRadius: 3,
    },
    rowChip: {
        position: "absolute",
        right: 11,
        top: 15,
        width: 30,
        height: 12,
        borderRadius: 6,
    },
    tab: {
        position: "absolute",
        bottom: 12,
        left: "50%",
        width: 44,
        height: 6,
        marginLeft: -22,
        borderRadius: 3,
    },
});
