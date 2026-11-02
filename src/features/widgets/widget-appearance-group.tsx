import { PALETTES } from "@/features/appearance/palettes";
import { useEarningsTheme } from "@/features/earnings/theme";
import { useI18n } from "@/features/i18n/i18n";
import type { TranslationKey } from "@/features/i18n/translations";

import { BackgroundArt } from "./widget-background-art";
import { CollapsibleCard } from "./widget-collapsible-card";
import { BACKGROUNDS, WIDGET_THEMES } from "./widget-config";
import type { WidgetDesignProps } from "./widget-design-props";
import { iconChips } from "./widget-option-icons";
import { OptionChips, OptionGroup, PickerTiles } from "./widget-options";
import { SwatchRow } from "./widget-swatch-row";

const APPEARANCE_ICON = "M12 3.5c3.6 4.3 6 7.5 6 10.5a6 6 0 0 1-12 0c0-3 2.4-6.2 6-10.5Z";

const THEME_KEYS = {
    system: "settings.mode.system",
    light: "settings.mode.light",
    dark: "settings.mode.dark",
} as const satisfies Record<string, TranslationKey>;

export function WidgetAppearanceGroup({ config, set }: WidgetDesignProps) {
    const { colors } = useEarningsTheme();
    const { t } = useI18n();

    return (
        <CollapsibleCard testID="widget-group-appearance" icon={APPEARANCE_ICON} title={t("widgets.group.appearance")}>
            <OptionGroup label={t("widgets.section.colors")}>
                <SwatchRow
                    label={t("widgets.section.colors")}
                    appValue="app"
                    appLabel={t("widgets.sameAsApp")}
                    appColor={colors.accent}
                    swatches={PALETTES.map((palette) => ({
                        value: palette.id,
                        label: t(`palette.${palette.id}`),
                        color: palette.accent,
                    }))}
                    value={config.palette}
                    onChange={set("palette")}
                />
            </OptionGroup>
            <OptionGroup label={t("widgets.section.theme")}>
                <OptionChips
                    testID="widget-theme"
                    label={t("widgets.section.theme")}
                    options={iconChips(WIDGET_THEMES, config.theme, (value) =>
                        t(value === "app" ? "widgets.sameAsApp" : THEME_KEYS[value]),
                    )}
                    value={config.theme}
                    onChange={set("theme")}
                />
            </OptionGroup>
            <OptionGroup label={t("widgets.section.background")}>
                <PickerTiles
                    testID="widget-background"
                    label={t("widgets.section.background")}
                    height={50}
                    options={BACKGROUNDS.map((background) => ({
                        value: background,
                        label: t(`widgets.background.${background}`),
                        art: <BackgroundArt background={background} />,
                    }))}
                    value={config.background}
                    onChange={set("background")}
                />
            </OptionGroup>
        </CollapsibleCard>
    );
}
