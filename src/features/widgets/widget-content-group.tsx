import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { CollapsibleCard } from "./widget-collapsible-card";
import { WIDGET_PERIODS } from "./widget-config";
import type { WidgetDesignProps } from "./widget-design-props";
import { iconChips } from "./widget-option-icons";
import { OptionChips, OptionGroup } from "./widget-options";
import { SwitchRow } from "./widget-switch-row";

const CONTENT_ICON = "M5 7h14M5 12h14M5 17h9";

const PERIOD_KEYS = {
    today: "period.today",
    week: "period.week",
    month: "period.month",
    year: "period.year",
} as const satisfies Record<string, TranslationKey>;

export function WidgetContentGroup({ config, set }: WidgetDesignProps) {
    const { t } = useI18n();

    return (
        <CollapsibleCard testID="widget-group-content" icon={CONTENT_ICON} title={t("widgets.section.content")}>
            <OptionGroup label={t("widgets.section.period")}>
                <OptionChips
                    testID="widget-period"
                    label={t("widgets.section.period")}
                    options={iconChips(WIDGET_PERIODS, config.period, (value) =>
                        t(value === "app" ? "widgets.sameAsApp" : PERIOD_KEYS[value]),
                    )}
                    value={config.period}
                    onChange={set("period")}
                />
            </OptionGroup>
            <SwitchRow
                testID="widget-toggle-cents"
                label={t("widgets.cents")}
                value={config.cents}
                onChange={set("cents")}
            />
            <SwitchRow
                testID="widget-toggle-caption"
                label={t("widgets.caption")}
                value={config.caption}
                disabled={config.template === "minimal"}
                onChange={set("caption")}
            />
        </CollapsibleCard>
    );
}
