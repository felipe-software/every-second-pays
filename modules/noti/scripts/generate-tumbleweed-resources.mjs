import fs from 'node:fs';
import path from 'node:path';

const [root, kotlinRoot] = process.argv.slice(2).map((directory) => path.resolve(directory));
if (!root || !kotlinRoot) {
    console.error('Usage: generate-tumbleweed-resources.mjs <res dir> <kotlin dir>');
    process.exit(1);
}

const NS = 'xmlns:android="http://schemas.android.com/apk/res/android"';
const OPEN = 'android:clipChildren="false" android:clipToPadding="false"';
const PLACEHOLDER = '<FrameLayout android:layout_width="0dp" android:layout_height="0dp" />';
const files = {};
const write = (relative, body) => {
    files[relative] = `<?xml version="1.0" encoding="utf-8"?>\n${body.trim()}\n`;
};

const i = (name) => `@interpolator/${name}`;
const attrs = (values) =>
    Object.entries(values)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `android:${key}="${value}"`)
        .join(' ');
const translate = (o) => `<translate ${attrs(o)} />`;
const alpha = (o) => `<alpha ${attrs(o)} />`;
const scale = (o) => `<scale ${attrs({ pivotX: '50%', pivotY: '50%', ...o })} />`;
const rotate = (o) => `<rotate ${attrs({ pivotX: '50%', pivotY: '50%', ...o })} />`;
const order = (child) => (child.startsWith('<translate') ? 1 : 0);
const anim = (name, children) =>
    write(
        `anim/${name}.xml`,
        `<set ${NS} android:shareInterpolator="false" android:fillAfter="true" android:fillBefore="true">\n    ${[...children].sort((a, b) => order(a) - order(b)).join('\n    ')}\n</set>`,
    );

const ROLL_START = 250;
const ROLL_MS = 3600;
const HOP_MS = 900;
const HOPS = 4;
const TRAVEL = 1.3;
const LANDINGS = Array.from({ length: HOPS - 1 }, (_, index) => ROLL_START + HOP_MS * (index + 1));
const WIND_AT = [100, 1400];
const SIGN_HIT = 950;

anim('ntw_go', [
    translate({ fromXDelta: '0', toXDelta: `-${TRAVEL * 100}%p`, startOffset: ROLL_START, duration: ROLL_MS, interpolator: i('nmb_i_linear') }),
]);
anim('ntw_up', Array.from({ length: HOPS }, (_, index) => {
    const at = ROLL_START + index * HOP_MS;
    return [
        translate({ fromYDelta: '0', toYDelta: '-52%', startOffset: at, duration: HOP_MS / 2, interpolator: i('nmb_i_out') }),
        translate({ fromYDelta: '0', toYDelta: '52%', startOffset: at + HOP_MS / 2, duration: HOP_MS / 2, interpolator: i('nmb_i_fall') }),
    ];
}).flat());
anim('ntw_spin', [
    rotate({ fromDegrees: 0, toDegrees: -360 * HOPS, startOffset: ROLL_START, duration: ROLL_MS, interpolator: i('nmb_i_linear') }),
]);
const wobble = [[-11, 180], [18, 225], [-10, 225], [3, 270]];
let wobbleAt = SIGN_HIT;
anim('ntw_wobble', wobble.map(([degrees, duration]) => {
    const child = rotate({ fromDegrees: 0, toDegrees: degrees, pivotY: '100%', startOffset: wobbleAt, duration, interpolator: i('nmb_i_ease') });
    wobbleAt += duration;
    return child;
}));
WIND_AT.forEach((at, index) =>
    anim(`ntw_wind_${index}`, [
        alpha({ fromAlpha: 0, toAlpha: 0.9, startOffset: at, duration: 390, interpolator: i('nmb_i_linear') }),
        alpha({ fromAlpha: 1, toAlpha: 0, startOffset: at + 910, duration: 390, interpolator: i('nmb_i_linear') }),
        translate({ fromXDelta: '0', toXDelta: '-45%p', startOffset: at, duration: 1300, interpolator: i('nmb_i_ease') }),
    ]));
LANDINGS.forEach((at, index) =>
    anim(`ntw_dust_${index}`, [
        alpha({ fromAlpha: 0, toAlpha: 0.9, startOffset: at, duration: 140, interpolator: i('nmb_i_linear') }),
        alpha({ fromAlpha: 1, toAlpha: 0, startOffset: at + 140, duration: 560, interpolator: i('nmb_i_linear') }),
        scale({ fromXScale: 0.3, toXScale: 1.5, fromYScale: 0.3, toYScale: 1.5, startOffset: at, duration: 700, interpolator: i('nmb_i_soft') }),
        translate({ fromXDelta: '0', toXDelta: '40%', fromYDelta: '0', toYDelta: '-150%', startOffset: at, duration: 700, interpolator: i('nmb_i_soft') }),
    ]));

const vector = (width, height, body) =>
    `<vector ${NS} android:width="${width}dp" android:height="${height}dp" android:viewportWidth="${width}" android:viewportHeight="${height}">\n    ${body.join('\n    ')}\n</vector>`;
const fill = (color, pathData) => `<path android:fillColor="${color}" android:pathData="${pathData}" />`;
const line = (color, width, pathData) =>
    `<path android:strokeColor="${color}" android:strokeWidth="${width}" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="${pathData}" />`;
const circle = (x, y, r) => `M${x - r},${y} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 -${2 * r},0 z`;
const gradient = (colors) =>
    `<gradient android:angle="270" android:startColor="${colors[0]}" ${colors[2] ? `android:centerColor="${colors[1]}" android:centerY="0.72" android:endColor="${colors[2]}"` : `android:endColor="${colors[1]}"`} />`;

write('drawable/ntw_sky.xml', `<shape ${NS} android:shape="rectangle">${gradient(['#FFFFE6BC', '#FFFBC48D', '#FFF5AE7A'])}<corners android:radius="14dp" /></shape>`);
write('drawable/ntw_ground.xml', `<shape ${NS} android:shape="rectangle">${gradient(['#FFDE9263', '#FFCF8357'])}</shape>`);
write('drawable/ntw_sun.xml', `<shape ${NS} android:shape="oval"><solid android:color="#FFFFF4D2" /></shape>`);
write('drawable/ntw_board.xml', `<shape ${NS} android:shape="rectangle"><solid android:color="#FF8A5A33" /><corners android:radius="2.5dp" /></shape>`);
write('drawable/ntw_post.xml', `<shape ${NS} android:shape="rectangle"><solid android:color="#FF6E4526" /></shape>`);
write('drawable/ntw_dust.xml', `<shape ${NS} android:shape="oval"><solid android:color="#FFFFE9CC" /></shape>`);
write('drawable/ntw_wind.xml', `<shape ${NS} android:shape="rectangle"><gradient android:angle="0" android:startColor="#00FFFFFF" android:centerColor="#CCFFFFFF" android:endColor="#00FFFFFF" /><corners android:radius="99dp" /></shape>`);
write('drawable/ntw_mesa.xml', vector(300, 40, [fill('#FFE8A077', 'M0,40 V24 h36 l8,-14 h44 l10,14 h60 l6,-8 h46 l8,14 h82 v16 z')]));
write('drawable/ntw_cactus.xml', vector(30, 50, [
    fill('#FF55703D', 'M12,50 V8 a4,4 0 0 1 8,0 V50 z M12,30 H7 a5,5 0 0 1 -5,-5 V18 a2.5,2.5 0 0 1 5,0 v7 h5 z M20,24 h4 V14 a2.5,2.5 0 0 1 5,0 V24 a5,5 0 0 1 -5,5 h-4 z'),
]));
const WEED = '#FF7A5230';
write('drawable/ntw_weed.xml', vector(40, 40, [
    line(WEED, 2, circle(20, 20, 17)),
    line(WEED, 2, 'M5,14 C14,8 30,10 36,20 M8,30 C14,20 28,16 35,26 M14,4 C10,16 14,30 24,37 M28,5 C32,16 28,30 16,36 M4,22 C14,26 26,28 34,12'),
    `<group android:translateX="11" android:translateY="14" android:scaleX="0.15" android:scaleY="0.15">
        ${fill('#FF5F9A4E', 'M4,25 a13,13 0 0 1 13,-13 h86 a13,13 0 0 1 13,13 v38 a13,13 0 0 1 -13,13 h-86 a13,13 0 0 1 -13,-13 z')}
        ${fill('#FFA7D98B', 'M4,18 a13,13 0 0 1 13,-13 h86 a13,13 0 0 1 13,13 v38 a13,13 0 0 1 -13,13 h-86 a13,13 0 0 1 -13,-13 z')}
        ${fill('#FFFFE7B5', 'M40,6 H80 V68 H40 Z')}
        ${fill('#FF7DBB63', circle(22, 37, 10))}
        ${fill('#FF7DBB63', circle(98, 37, 10))}
    </group>`,
]));

const sized = (gravity) => `android:layout_width="10dp" android:layout_height="10dp" android:layout_gravity="${gravity}"`;
const match = 'android:layout_width="match_parent" android:layout_height="match_parent"';
const image = (id, drawable, layout = match) =>
    `<ImageView android:id="@+id/${id}" ${layout} android:importantForAccessibility="no" android:scaleType="fitXY" android:src="@drawable/${drawable}" />`;
const flipper = (id, animation, child) =>
    `<ViewFlipper android:id="@+id/${id}" ${match} android:inAnimation="@anim/${animation}" ${OPEN}>
        ${PLACEHOLDER}
        ${child}
    </ViewFlipper>`;
const textLine = (id, family, color) =>
    `<TextView android:id="@+id/${id}" android:layout_width="match_parent" android:layout_height="wrap_content" android:fontFamily="${family}" android:includeFontPadding="false" android:maxLines="1" android:ellipsize="end" android:textColor="${color}" />`;

write('layout/ntw_root.xml', `<FrameLayout ${NS} android:id="@+id/ntw_stage" android:layout_width="match_parent" android:layout_height="100dp" android:background="@drawable/ntw_sky" android:clipChildren="true" android:clipToOutline="true">
    ${image('ntw_sun', 'ntw_sun', sized('bottom|right'))}
    ${image('ntw_mesa', 'ntw_mesa', 'android:layout_width="match_parent" android:layout_height="10dp" android:layout_gravity="bottom"')}
    ${image('ntw_ground', 'ntw_ground', 'android:layout_width="match_parent" android:layout_height="10dp" android:layout_gravity="bottom"')}
    ${image('ntw_cactus', 'ntw_cactus', sized('bottom|right'))}
    <FrameLayout android:id="@+id/ntw_sign" ${sized('bottom|right')} ${OPEN}>
        ${flipper('ntw_sign_t', 'ntw_wobble', `<LinearLayout ${match} android:orientation="vertical" android:gravity="center_horizontal">
            <TextView android:id="@+id/ntw_board" android:layout_width="match_parent" android:layout_height="wrap_content" android:background="@drawable/ntw_board" android:fontFamily="sans-serif" android:textStyle="bold" android:gravity="center" android:includeFontPadding="false" android:maxLines="1" android:textColor="#FFFFE7B5" />
            ${image('ntw_post', 'ntw_post', 'android:layout_width="10dp" android:layout_height="10dp"')}
        </LinearLayout>`)}
    </FrameLayout>
    ${WIND_AT.map((_, index) => flipper(`ntw_wind${index}_t`, `ntw_wind_${index}`, image(`ntw_wind${index}`, 'ntw_wind', sized('bottom|right')))).join('\n    ')}
    ${flipper('ntw_go', 'ntw_go', `<FrameLayout android:id="@+id/ntw_weed_box" ${sized('bottom|right')} ${OPEN}>
        ${flipper('ntw_up', 'ntw_up', `<FrameLayout ${match} ${OPEN}>
            ${flipper('ntw_spin', 'ntw_spin', image('ntw_weed', 'ntw_weed'))}
        </FrameLayout>`)}
    </FrameLayout>`)}
    ${LANDINGS.map((_, index) => flipper(`ntw_dust${index}_t`, `ntw_dust_${index}`, image(`ntw_dust${index}`, 'ntw_dust', sized('bottom|right')))).join('\n    ')}
    <LinearLayout android:id="@+id/ntw_text" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_gravity="top|left" android:orientation="vertical">
        ${textLine('ntw_title', 'sans-serif-medium', '#FF3A2212')}
        ${textLine('ntw_body', 'sans-serif', '#DB3A2212')}
    </LinearLayout>
</FrameLayout>`);

for (const [relative, contents] of Object.entries(files)) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
}

const directory = path.join(kotlinRoot, 'expo/modules/notificationmotion/bills');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'TumbleweedTables.kt'), `package expo.modules.notificationmotion.bills

import expo.modules.notificationmotion.R

internal class TumbleweedSprite(val trigger: Int, val image: Int, val at: Int)

internal object TumbleweedTables {
  const val ROLL_START = ${ROLL_START}
  const val ROLL_MS = ${ROLL_MS}
  const val TRAVEL = ${TRAVEL}f
  val winds = listOf(${WIND_AT.map((at, index) => `TumbleweedSprite(R.id.ntw_wind${index}_t, R.id.ntw_wind${index}, ${at})`).join(', ')})
  val dusts = listOf(${LANDINGS.map((at, index) => `TumbleweedSprite(R.id.ntw_dust${index}_t, R.id.ntw_dust${index}, ${at})`).join(', ')})
}
`);
console.log(`Wrote ${Object.keys(files).length} tumbleweed resources.`);
