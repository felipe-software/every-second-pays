import { ambient, UNIT } from "./money-widget-ambient.mjs";
import { motions, QUADRANTS } from "./money-widget-motions.mjs";
import { NS, round } from "./resource-xml.mjs";

const PLACEHOLDER = '<FrameLayout android:layout_width="0dp" android:layout_height="0dp" />';
const flipperTrigger = (id, animName, child, { size = "match_parent", extra = "" } = {}) =>
    `<ViewFlipper android:id="@+id/${id}" android:layout_width="${size}" android:layout_height="${size}" android:animateFirstView="false" android:clipChildren="false" android:clipToPadding="false" android:inAnimation="@anim/${animName}" ${extra}>
        ${PLACEHOLDER}
        ${child}
    </ViewFlipper>`;
const image = (id, drawable, { size: [w, h], gravity, extra = "" }) =>
    `<ImageView android:id="@+id/${id}" android:layout_width="${w}dp" android:layout_height="${h}dp" android:layout_gravity="${gravity}" android:importantForAccessibility="no" android:scaleType="fitCenter" android:src="@drawable/${drawable}" ${extra} />`;
const frame = (body, extra = "") =>
    `<FrameLayout ${NS} android:layout_width="match_parent" android:layout_height="match_parent" android:clipChildren="false" android:clipToPadding="false" android:importantForAccessibility="noHideDescendants" ${extra}>
    ${body}
</FrameLayout>`;
const ANCHORS = { center: "center", start: "center_vertical|left" };
const billImage = (id, spec, gravity) =>
    `<ImageView android:id="@+id/${id}" android:layout_width="${round(spec.size * UNIT, 1)}dp" android:layout_height="${round(spec.size * UNIT, 1)}dp" android:layout_gravity="${gravity}" android:alpha="${spec.alpha}" android:rotation="${spec.rotation}" android:importantForAccessibility="no" android:scaleType="fitCenter" android:src="@drawable/nmw_note" />`;
const container = (id, layoutAnimation, body) =>
    `<FrameLayout android:id="@+id/${id}" android:layout_width="match_parent" android:layout_height="match_parent" android:clipChildren="false" android:clipToPadding="false" android:layoutAnimation="@anim/${layoutAnimation}">
        ${body}
    </FrameLayout>`;
// Masking rolls takes an untransformed parent: a ViewGroup clips a child to its own moved bounds.
const slotText = (id) =>
    `<TextView android:id="@+id/${id}" android:layout_width="wrap_content" android:layout_height="match_parent" android:fontFamily="sans-serif" android:textStyle="bold" android:fontFeatureSettings="tnum" android:letterSpacing="-0.02" android:gravity="top|center_horizontal" android:includeFontPadding="false" android:maxLines="1" android:textColor="#FFFFFFFF" />`;
const textView = (id, font, size, { extra = "", height = "wrap_content" } = {}) =>
    `<TextView android:id="@+id/${id}" android:layout_width="wrap_content" android:layout_height="${height}" android:fontFamily="${font}" android:includeFontPadding="false" android:maxLines="1" android:ellipsize="end" android:textSize="${size}sp" android:textColor="#FFFFFFFF" ${extra} />`;

function addEffectLayouts({ write }) {
    write(
        "layout/nmw_live.xml",
        `<FrameLayout ${NS} android:layout_width="14dp" android:layout_height="14dp" android:clipChildren="false" android:importantForAccessibility="noHideDescendants">
    ${flipperTrigger("nmw_p0", "nmw_p_halo", image("nmw_i0", "nmw_dot", { size: [14, 14], gravity: "center" }))}
    ${flipperTrigger("nmw_p1", "nmw_p_live", image("nmw_i1", "nmw_dot", { size: [7, 7], gravity: "center" }))}
</FrameLayout>`,
    );

    for (const [anchor, gravity] of Object.entries(ANCHORS)) {
        for (const [name, slots] of Object.entries(ambient)) {
            write(
                `layout/nmw_amb_${name}_${anchor}.xml`,
                frame(
                    slots
                        .map((spec, index) => {
                            const bill = billImage(`nmw_ai${index}`, spec, gravity);
                            return name === "orbit"
                                ? container(
                                      `nmw_a${index}`,
                                      `nmw_la_${name}_${index}`,
                                      container(`nmw_ab${index}`, `nmw_la_${name}_${index}_bill`, bill),
                                  )
                                : container(`nmw_a${index}`, `nmw_la_${name}_${index}`, bill);
                        })
                        .join("\n    "),
                ),
            );
        }
        for (const quadrant of Object.keys(QUADRANTS)) {
            const corner = `${quadrant[1] === "t" ? "top" : "bottom"}|${quadrant[0] === "l" ? "left" : "right"}`;
            write(
                `layout/nmw_fly_${quadrant}_${anchor}.xml`,
                `<FrameLayout ${NS} android:id="@+id/nmw_fly_box" android:layout_width="36dp" android:layout_height="36dp" android:layout_gravity="${gravity}" android:clipChildren="false" android:clipToPadding="false" android:importantForAccessibility="noHideDescendants">
    ${flipperTrigger("nmw_fly", `nmw_fly_${quadrant}`, `<ImageView android:id="@+id/nmw_fly_bill" android:layout_width="36dp" android:layout_height="36dp" android:layout_gravity="${corner}" android:importantForAccessibility="no" android:scaleType="fitCenter" android:src="@drawable/nmw_note" />`)}
</FrameLayout>`,
            );
        }
    }
}

function addDigitLayouts({ write }) {
    for (const name of Object.keys(motions)) {
        const clips = name === "roll" || name === "slot";
        for (const timing of ["", "_late"]) {
            const trigger = (
                id,
                animName,
                text,
            ) => `<ViewFlipper android:id="@+id/${id}" android:layout_width="wrap_content" android:layout_height="match_parent" android:animateFirstView="false" android:clipChildren="false" android:clipToPadding="false" android:inAnimation="@anim/${animName}">
        ${PLACEHOLDER}
        ${slotText(text)}
    </ViewFlipper>`;
            write(
                `layout/nmw_slot_${name}${timing}.xml`,
                `<FrameLayout ${NS} android:id="@+id/nmw_slot" android:layout_width="wrap_content" android:layout_height="wrap_content" android:clipChildren="${clips}" android:clipToPadding="${clips}">
    ${trigger("nmw_slot_out", `nmw_m_${name}_out${timing}`, "nmw_slot_a")}
    ${trigger("nmw_slot_in", `nmw_m_${name}_in${timing}`, "nmw_slot_b")}
</FrameLayout>`,
            );
        }
    }
    write(
        "layout/nmw_run.xml",
        `<TextView ${NS} android:id="@+id/nmw_run" android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif" android:textStyle="bold" android:fontFeatureSettings="tnum" android:letterSpacing="-0.02" android:gravity="top" android:includeFontPadding="false" android:maxLines="1" android:textColor="#FFFFFFFF" />`,
    );

    for (const [anchor, gravity] of Object.entries(ANCHORS)) {
        for (const bump of ["cents", "whole"]) {
            write(
                `layout/nmw_frame_${anchor}_${bump}.xml`,
                frame(
                    `<include layout="@layout/nmw_aurora" />
    <FrameLayout android:id="@+id/nmw_ambient" android:layout_width="match_parent" android:layout_height="match_parent" android:clipChildren="false" android:clipToPadding="false" />
    <ViewFlipper android:id="@+id/nmw_bump" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_gravity="${gravity}" android:animateFirstView="false" android:clipChildren="false" android:clipToPadding="false" android:inAnimation="@anim/nmw_bump_${bump}">
        ${PLACEHOLDER}
        <LinearLayout android:id="@+id/nmw_row" android:layout_width="wrap_content" android:layout_height="wrap_content" android:baselineAligned="false" android:clipChildren="false" android:clipToPadding="false" android:orientation="horizontal" />
    </ViewFlipper>
    <FrameLayout android:id="@+id/nmw_over" android:layout_width="match_parent" android:layout_height="match_parent" android:clipChildren="false" android:clipToPadding="false" />`,
                    'android:id="@+id/nmw_frame"',
                ),
            );
        }
    }
}

function addWidgetLayouts({ write }) {
    write(
        "layout/nmw_widget.xml",
        `<FrameLayout ${NS} android:id="@android:id/background" android:layout_width="match_parent" android:layout_height="match_parent" android:background="@drawable/nmw_widget_bg" android:clipChildren="true" android:clipToOutline="true">
    <LinearLayout android:id="@+id/nmw_content" android:layout_width="match_parent" android:layout_height="match_parent" android:gravity="center_horizontal" android:orientation="vertical" android:paddingLeft="16dp" android:paddingTop="12dp" android:paddingRight="16dp" android:paddingBottom="12dp">
        <LinearLayout android:id="@+id/nmw_header" android:layout_width="wrap_content" android:layout_height="18dp" android:gravity="center_vertical" android:orientation="horizontal">
            <FrameLayout android:id="@+id/nmw_live_host" android:layout_width="14dp" android:layout_height="14dp" android:layout_marginRight="6dp" />
            ${textView("nmw_period", "sans-serif-medium", 12, { extra: 'android:letterSpacing="0.08"' })}
        </LinearLayout>
        <FrameLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" />
        ${textView("nmw_caption", "sans-serif-medium", 12, { extra: 'android:gravity="center_vertical"', height: "18dp" })}
    </LinearLayout>
    <AdapterViewFlipper android:id="@+id/nmw_ticker" android:layout_width="match_parent" android:layout_height="match_parent" android:animateFirstView="false" android:autoStart="true" android:clipChildren="false" android:clipToPadding="false" android:flipInterval="1000" android:inAnimation="@animator/nmw_instant_in" android:outAnimation="@animator/nmw_instant_out" />
</FrameLayout>`,
    );
    write(
        "layout/nmw_loading.xml",
        `<FrameLayout ${NS} android:id="@android:id/background" android:layout_width="match_parent" android:layout_height="match_parent" android:background="@drawable/nmw_widget_bg" android:backgroundTint="#FF141816" android:clipToOutline="true">
    <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_gravity="center" android:fontFamily="sans-serif" android:textStyle="bold" android:text="$0.00" android:textColor="#FFEBF0ED" android:textSize="34sp" />
</FrameLayout>`,
    );
    write(
        "layout/nmw_preview.xml",
        `<FrameLayout ${NS} android:id="@android:id/background" android:layout_width="match_parent" android:layout_height="match_parent" android:background="@drawable/nmw_widget_bg" android:backgroundTint="#FF141816" android:clipToOutline="true">
    ${image("nmw_preview_glow", "nmw_glow_blob", { size: [240, 240], gravity: "center", extra: 'android:alpha="0.35" android:tint="#FF58AD85"' })}
    ${image("nmw_preview_note_a", "nmw_note", { size: [38, 38], gravity: "top|left", extra: 'android:layout_marginLeft="18dp" android:layout_marginTop="10dp" android:rotation="-18"' })}
    ${image("nmw_preview_note_b", "nmw_note", { size: [30, 30], gravity: "bottom|right", extra: 'android:layout_marginRight="22dp" android:layout_marginBottom="12dp" android:rotation="14" android:alpha="0.8"' })}
    ${image("nmw_preview_note_c", "nmw_note", { size: [26, 26], gravity: "top|right", extra: 'android:layout_marginRight="40dp" android:layout_marginTop="16dp" android:rotation="8" android:alpha="0.6"' })}
    <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_gravity="center" android:fontFamily="sans-serif" android:textStyle="bold" android:fontFeatureSettings="tnum" android:includeFontPadding="false" android:text="$124.80" android:textColor="#FFEBF0ED" android:textSize="40sp" />
</FrameLayout>`,
    );

    write(
        "xml/nmw_money_widget_info.xml",
        `<appwidget-provider ${NS}
    android:description="@string/nmw_widget_description"
    android:configure="expo.modules.notificationmotion.money.MoneyWidgetConfigureActivity"
    android:initialLayout="@layout/nmw_loading"
    android:minWidth="110dp"
    android:minHeight="50dp"
    android:minResizeWidth="110dp"
    android:minResizeHeight="50dp"
    android:previewLayout="@layout/nmw_preview"
    android:resizeMode="horizontal|vertical"
    android:targetCellWidth="4"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:widgetCategory="home_screen"
    android:widgetFeatures="reconfigurable|configuration_optional" />`,
    );
}

export function addLayouts(resources) {
    addEffectLayouts(resources);
    addDigitLayouts(resources);
    addWidgetLayouts(resources);
}
