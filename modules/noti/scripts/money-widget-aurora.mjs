import { IMPACT } from "./money-widget-motions.mjs";
import { alpha, i, NS, round, translate } from "./resource-xml.mjs";

// Animations can't brighten past the view, so it is drawn at the peak and held down at REST.
const AURORA_REST = 0.525;
export const aurora = [
    {
        size: 260,
        baseX: -0.55,
        baseY: -0.7,
        dirX: 0.9,
        dirY: 0.44,
        amplitude: 0.14,
        leg: 7,
        alpha: 0.42,
        tone: "accent",
        phase: 0,
    },
    {
        size: 220,
        baseX: 0.62,
        baseY: 0.62,
        dirX: -0.86,
        dirY: -0.5,
        amplitude: 0.14,
        leg: 8,
        alpha: 0.32,
        tone: "deep",
        phase: 0.37,
    },
    {
        size: 180,
        baseX: 0.05,
        baseY: 0.05,
        dirX: 0.8,
        dirY: -0.6,
        amplitude: 0.12,
        leg: 11,
        alpha: 0.42,
        tone: "accent",
        phase: 0.71,
    },
];
// Key order must match the renderer's PULSE_* constants and forward/back direction indices.
export const AURORA_PULSES = { n: 1, c: 1.43, w: 1.9 };
export const AURORA_DIRECTIONS = { f: 1, b: -1 };

export function addAuroraAnimations({ write, anim }) {
    aurora.forEach((blob, index) => {
        const perSecond = ((2 * blob.amplitude) / blob.leg) * 100;
        for (const [d, sign] of Object.entries(AURORA_DIRECTIONS)) {
            for (const [v, peak] of Object.entries(AURORA_PULSES)) {
                const name = `nmw_au${index}${d}${v}`;
                anim(name, [
                    alpha({ fromAlpha: AURORA_REST, toAlpha: AURORA_REST, duration: 1000 }),
                    ...(peak === 1
                        ? []
                        : [
                              alpha({
                                  fromAlpha: 1,
                                  toAlpha: peak,
                                  startOffset: IMPACT,
                                  duration: 105,
                                  interpolator: i("nmw_i_decelerate"),
                              }),
                              alpha({
                                  fromAlpha: 1,
                                  toAlpha: round(1 / peak, 4),
                                  startOffset: IMPACT + 105,
                                  duration: 360,
                                  interpolator: i("nmw_i_decelerate"),
                              }),
                          ]),
                    translate({
                        fromXDelta: "0",
                        toXDelta: `${round(sign * blob.dirX * perSecond, 2)}%`,
                        fromYDelta: "0",
                        toYDelta: `${round(sign * blob.dirY * perSecond, 2)}%`,
                        duration: 1000,
                        interpolator: i("nmw_i_linear"),
                    }),
                ]);
                write(
                    `anim/nmw_la_au${index}${d}${v}.xml`,
                    `<layoutAnimation ${NS} android:animation="@anim/${name}" android:delay="0" />`,
                );
            }
        }
    });
}

export function addAuroraLayout({ write }) {
    write(
        "layout/nmw_aurora.xml",
        `<FrameLayout ${NS} android:id="@+id/nmw_aurora" android:layout_width="match_parent" android:layout_height="match_parent" android:clipChildren="false" android:importantForAccessibility="noHideDescendants" android:visibility="gone">
    ${aurora
        .flatMap((blob, index) =>
            Object.keys(AURORA_DIRECTIONS).flatMap((d) =>
                Object.keys(AURORA_PULSES).map(
                    (
                        v,
                    ) => `<FrameLayout android:id="@+id/nmw_au${index}${d}${v}" android:layout_width="match_parent" android:layout_height="match_parent" android:clipChildren="false" android:layoutAnimation="@anim/nmw_la_au${index}${d}${v}" android:visibility="gone">
        <ImageView android:id="@+id/nmw_aui${index}${d}${v}" android:layout_width="${blob.size}dp" android:layout_height="${blob.size}dp" android:layout_gravity="center" android:alpha="${round(blob.alpha / AURORA_REST, 3)}" android:importantForAccessibility="no" android:scaleType="fitXY" android:src="@drawable/nmw_glow_blob" />
    </FrameLayout>`,
                ),
            ),
        )
        .join("\n    ")}
</FrameLayout>`,
    );
}
