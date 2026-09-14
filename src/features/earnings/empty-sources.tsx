import { Image } from "expo-image";
import { Platform, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useI18n } from "@/features/i18n/i18n";

import { useEarningsTheme } from "./theme";

export function EmptySourcesMessage() {
    const { t } = useI18n();
    return (
        <View testID="empty-sources" className="items-center py-4">
            <Text className="text-center font-sans text-[17px] font-semibold text-ink">{t("home.noSources")}</Text>
        </View>
    );
}

function FirstSourceArrow({ color }: { color: string }) {
    if (Platform.OS === "android") {
        return (
            <Svg width={156} height={90} viewBox="0 0 156 90" fill="none" accessible={false}>
                <Path
                    d="M8 8 C48 3 118 12 129 48 C132 58 132 68 130 81"
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={[6, 7]}
                />
                <Path
                    d="M118 68 Q124 76 130 82 Q138 76 144 69"
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        );
    }

    const arrow = `<svg xmlns="http://www.w3.org/2000/svg" width="156" height="90" viewBox="0 0 156 90" fill="none"><g stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8 C48 3 118 12 129 48 C132 58 132 68 130 81" stroke-dasharray="6 7"/><path d="M118 68 Q124 76 130 82 Q138 76 144 69"/></g></svg>`;

    return (
        <Image
            source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(arrow)}` }}
            style={{ width: 156, height: 90 }}
            contentFit="contain"
            accessible={false}
        />
    );
}

export function EmptySourcesCallout({ bottomInset }: { bottomInset: number }) {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();
    const bottom = Platform.OS === "android"
        ? Math.max(bottomInset, 20) + 80
        : Math.max(bottomInset + 4, 12);

    return (
        <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="first-source-callout"
            className="absolute right-[26px] items-end"
            style={{ bottom }}
        >
            <Text className="mr-10 max-w-[250px] font-sans text-[15px] font-medium text-accent-deep" style={{ transform: [{ rotate: "-4deg" }] }}>{t("home.addSource")}</Text>
            <FirstSourceArrow color={colors.accentDeep} />
        </View>
    );
}
