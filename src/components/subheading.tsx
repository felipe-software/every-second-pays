import { Text } from "react-native";

import { useEarningsTheme } from "@/features/earnings/theme";
import { useI18n } from "@/features/i18n/i18n";

export function Subheading({ children, required = false, className = "" }: { children: string; required?: boolean; className?: string }) {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();

    return (
        <Text
            accessibilityRole="header"
            accessibilityLabel={required ? `${children}, ${t("payment.required")}` : undefined}
            className={`font-sans text-[13px] font-semibold text-muted ${className}`}
        >
            {children}
            {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
    );
}
