import { Card } from "@/components/settings-card";
import { useI18n } from "@/features/i18n/i18n";

import { TEMPLATES } from "./widget-config";
import type { WidgetDesignProps } from "./widget-design-props";
import { PickerTiles, SizeSegments } from "./widget-options";
import { type PreviewSize, PREVIEW_SIZES } from "./widget-preview-pager";
import { TemplateArt } from "./widget-template-art";

const SIZE_GLYPHS: Readonly<Record<PreviewSize, { width: number; height: number }>> = {
    small: { width: 14, height: 14 },
    wide: { width: 22, height: 14 },
    large: { width: 22, height: 18 },
};

export function WidgetLayoutCard({
    config,
    set,
    previewSize,
    onPreviewSizeChange,
    sampleSymbol,
    sampleAmount,
    sampleCaption,
}: WidgetDesignProps & {
    previewSize: PreviewSize;
    onPreviewSizeChange: (size: PreviewSize) => void;
    sampleSymbol: string;
    sampleAmount: string;
    sampleCaption: string;
}) {
    const { t } = useI18n();

    return (
        <Card className="gap-3.5 p-3">
            <SizeSegments
                label={t("widgets.section.size")}
                options={PREVIEW_SIZES.map((size) => ({
                    value: size,
                    label: t(`widgets.size.${size}`),
                    glyph: SIZE_GLYPHS[size],
                }))}
                value={previewSize}
                onChange={onPreviewSizeChange}
            />
            <PickerTiles
                testID="widget-template"
                label={t("widgets.section.layout")}
                height={66}
                options={TEMPLATES.map((template) => ({
                    value: template,
                    label: t(`widgets.template.${template}`),
                    art: (
                        <TemplateArt
                            template={template}
                            symbol={sampleSymbol}
                            amount={sampleAmount}
                            caption={sampleCaption}
                            period={t("settings.previewToday")}
                        />
                    ),
                }))}
                value={config.template}
                onChange={set("template")}
            />
        </Card>
    );
}
