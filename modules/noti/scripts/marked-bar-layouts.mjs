import { NS } from "./resource-xml.mjs";

export const PLACEHOLDER = '<FrameLayout android:layout_width="0dp" android:layout_height="0dp" />';
export const OPEN = 'android:clipChildren="false" android:clipToPadding="false"';
export const flipper = (id, animation, child, extra = "") =>
    `<ViewFlipper android:id="@+id/${id}" android:layout_width="match_parent" android:layout_height="match_parent" android:inAnimation="@anim/${animation}" ${OPEN} ${extra}>
        ${PLACEHOLDER}
        ${child}
    </ViewFlipper>`;
export const pieceImage = (id, drawable, extra = "") =>
    `<ImageView android:id="@+id/${id}" android:layout_width="10dp" android:layout_height="10dp" android:layout_gravity="center" android:importantForAccessibility="no" android:scaleType="fitXY" android:src="@drawable/${drawable}" ${extra} />`;
export const box = (body) =>
    `<FrameLayout ${NS} android:id="@+id/nmb_fx_box" android:layout_width="100dp" android:layout_height="100dp" android:layout_gravity="top|left" android:importantForAccessibility="noHideDescendants" ${OPEN}>
    ${body}
</FrameLayout>`;
export const flashFace = `<FrameLayout android:id="@+id/nmb_flash_face" android:layout_width="100dp" android:layout_height="100dp" android:layout_gravity="center">
            <ImageView android:id="@+id/nmb_flash_glow" android:layout_width="match_parent" android:layout_height="match_parent" android:importantForAccessibility="no" android:scaleType="fitXY" android:src="@drawable/nmb_glow" />
            <ImageView android:id="@+id/nmb_flash_core" android:layout_width="30dp" android:layout_height="30dp" android:layout_gravity="center" android:importantForAccessibility="no" android:scaleType="fitXY" android:src="@drawable/nmb_glow" />
        </FrameLayout>`;
export const billBody = (index, animation, piece) =>
    flipper(
        `nmb_b${index}`,
        animation,
        pieceImage(`nmb_bi${index}`, "nmw_note", piece.flip < 0 ? 'android:scaleX="-1"' : ""),
    );
export const sparkBody = (index, animation, piece) =>
    flipper(
        `nmb_s${index}`,
        animation,
        pieceImage(
            `nmb_si${index}`,
            piece.width === piece.height ? "nmb_round" : "nmb_streak",
            `android:rotation="${piece.rotation}"`,
        ),
    );
const markText = (id) =>
    `<TextView android:id="@+id/${id}" android:layout_width="match_parent" android:layout_height="match_parent" android:fontFamily="sans-serif-medium" android:gravity="center" android:includeFontPadding="false" android:letterSpacing="-0.01" android:maxLines="1" android:textColor="#FFFFFFFF" />`;
const blob = (id, gravity) =>
    `<ImageView android:id="@+id/${id}" android:layout_width="100dp" android:layout_height="100dp" android:layout_gravity="${gravity}" android:alpha="0.95" android:importantForAccessibility="no" android:scaleType="fitXY" android:src="@drawable/nmb_glow" />`;
const plane =
    '<FrameLayout android:id="@+id/nmb_plane" android:layout_width="100dp" android:layout_height="match_parent" android:layout_gravity="center_horizontal" android:importantForAccessibility="noHideDescendants" android:clipChildren="false" android:clipToPadding="false" />';
const rootLayout = (
    set,
    inner,
) => `<FrameLayout ${NS} android:id="@+id/nmb_stage" android:layout_width="match_parent" android:layout_height="100dp" android:background="@drawable/nmb_stage_bg" android:clipChildren="true" android:clipToOutline="true">
    ${inner(`${flipper("nmb_pulse_a", `nmb_pulse_${set}`, blob("nmb_blob_a", "top|left"))}
        ${flipper("nmb_pulse_b", `nmb_pulse_${set}`, blob("nmb_blob_b", "bottom|right"))}
        ${plane}`)}
</FrameLayout>`;

export function addLayouts({ write }, lightSteps) {
    for (const step of lightSteps) {
        write(
            `layout/nmb_mark_lit_${step}.xml`,
            `<FrameLayout ${NS} android:id="@+id/nmb_mark" android:layout_width="20dp" android:layout_height="20dp" android:layout_gravity="top|left" ${OPEN}>
    ${flipper(
        "nmb_mark_pop",
        `nmb_pop_${step}`,
        `<FrameLayout android:layout_width="match_parent" android:layout_height="match_parent" ${OPEN}>
            ${markText("nmb_mark_cold")}
            ${flipper("nmb_mark_hot_trigger", `nmb_hot_${step}`, markText("nmb_mark_hot"))}
        </FrameLayout>`,
    )}
</FrameLayout>`,
        );
    }
    write(
        "layout/nmb_mark_rest.xml",
        `<FrameLayout ${NS} android:id="@+id/nmb_mark" android:layout_width="20dp" android:layout_height="20dp" android:layout_gravity="top|left">
    ${markText("nmb_mark_cold")}
</FrameLayout>`,
    );

    write(
        "layout/nmb_bar.xml",
        `<FrameLayout ${NS} android:id="@+id/nmb_bar" android:layout_width="100dp" android:layout_height="9dp" android:layout_gravity="top|left" android:background="@drawable/nmb_pill" android:clipToOutline="true" android:importantForAccessibility="noHideDescendants" />`,
    );
    write(
        "layout/nmb_bar_done.xml",
        `<ImageView ${NS} android:id="@+id/nmb_bar_done" android:layout_width="10dp" android:layout_height="match_parent" android:layout_gravity="left" android:importantForAccessibility="no" android:scaleType="fitXY" android:src="@drawable/nmb_solid" />`,
    );
    write(
        "layout/nmb_tick.xml",
        `<ImageView ${NS} android:id="@+id/nmb_tick" android:layout_width="4dp" android:layout_height="4dp" android:layout_gravity="center_vertical|left" android:importantForAccessibility="no" android:scaleType="fitXY" android:src="@drawable/nmb_round" />`,
    );
    write(
        "layout/nmb_run.xml",
        `<TextView ${NS} android:id="@+id/nmb_run" android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif" android:textStyle="bold" android:fontFeatureSettings="tnum" android:letterSpacing="-0.02" android:gravity="bottom" android:includeFontPadding="false" android:maxLines="1" android:textColor="#FFFFFFFF" />`,
    );
    write(
        "layout/nmb_amount_slot.xml",
        `<FrameLayout ${NS} android:id="@+id/nmb_amount_slot" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_gravity="top" ${OPEN} />`,
    );

    write(
        "layout/nmb_root_short.xml",
        rootLayout(
            "short",
            (body) => `<FrameLayout android:layout_width="match_parent" android:layout_height="match_parent" ${OPEN}>
        ${body}
    </FrameLayout>`,
        ),
    );
    write(
        "layout/nmb_root_chain.xml",
        rootLayout("chain", (body) =>
            flipper(
                "nmb_shake",
                "nmb_shake",
                `<FrameLayout android:layout_width="match_parent" android:layout_height="match_parent" ${OPEN}>
        ${body}
    </FrameLayout>`,
            ),
        ),
    );

    write(
        "drawable/nmb_stage_bg.xml",
        `<shape ${NS} android:shape="rectangle"><solid android:color="#FFFFFFFF" /><corners android:radius="14dp" /></shape>`,
    );
    write(
        "drawable/nmb_pill.xml",
        `<shape ${NS} android:shape="rectangle"><solid android:color="#FFFFFFFF" /><corners android:radius="99dp" /></shape>`,
    );
    write(
        "drawable/nmb_solid.xml",
        `<shape ${NS} android:shape="rectangle"><solid android:color="#FFFFFFFF" /></shape>`,
    );
    write("drawable/nmb_round.xml", `<shape ${NS} android:shape="oval"><solid android:color="#FFFFFFFF" /></shape>`);
    write(
        "drawable/nmb_streak.xml",
        `<shape ${NS} android:shape="rectangle"><solid android:color="#FFFFFFFF" /><corners android:radius="99dp" /></shape>`,
    );
    write(
        "drawable/nmb_ring.xml",
        `<shape ${NS} android:shape="oval"><stroke android:width="3dp" android:color="#FFFFFFFF" /></shape>`,
    );
    write(
        "drawable/nmb_glow.xml",
        `<shape ${NS} android:shape="oval"><gradient android:type="radial" android:gradientRadius="50%" android:startColor="#FFFFFFFF" android:centerColor="#66FFFFFF" android:endColor="#00FFFFFF" /></shape>`,
    );
}
