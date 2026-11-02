import { useI18n } from "@/features/i18n/i18n";

import { CollapsibleCard } from "./widget-collapsible-card";
import { EFFECTS, INTENSITIES, MOTIONS } from "./widget-config";
import type { WidgetDesignProps } from "./widget-design-props";
import { iconChips } from "./widget-option-icons";
import { OptionChips, OptionGroup } from "./widget-options";

const MOTION_ICON = "M3 12c1.5-3 3-3 4.5 0s3 3 4.5 0 3-3 4.5 0 3 3 4.5 0";

export function WidgetMotionGroup({ config, set }: WidgetDesignProps) {
    const { t } = useI18n();

    return (
        <CollapsibleCard testID="widget-group-motion" icon={MOTION_ICON} title={t("widgets.group.motion")}>
            <OptionGroup label={t("widgets.section.effect")}>
                <OptionChips
                    testID="widget-effect"
                    label={t("widgets.section.effect")}
                    options={iconChips(EFFECTS, config.effect, (value) => t(`widgets.effect.${value}`))}
                    value={config.effect}
                    onChange={set("effect")}
                />
            </OptionGroup>
            <OptionGroup label={t("widgets.section.motion")}>
                <OptionChips
                    testID="widget-motion"
                    label={t("widgets.section.motion")}
                    options={iconChips(MOTIONS, config.motion, (value) => t(`widgets.motion.${value}`))}
                    value={config.motion}
                    onChange={set("motion")}
                />
            </OptionGroup>
            <OptionGroup label={t("widgets.section.intensity")}>
                <OptionChips
                    testID="widget-intensity"
                    label={t("widgets.section.intensity")}
                    options={iconChips(INTENSITIES, config.intensity, (value) => t(`widgets.intensity.${value}`))}
                    value={config.intensity}
                    onChange={set("intensity")}
                />
            </OptionGroup>
        </CollapsibleCard>
    );
}
