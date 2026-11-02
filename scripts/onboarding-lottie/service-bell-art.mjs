import { round } from "./lottie-transform.mjs";
import { BELL_X, RINGS_Y } from "./service-bell-poses.mjs";
import { contours } from "./svg-path.mjs";

export const color = (value) =>
    value.length === 7
        ? [1, 3, 5]
              .map((start) => parseInt(value.slice(start, start + 2), 16) / 255)
              .concat(1)
              .map(round)
        : value;
export const still = (k) => ({ a: 0, k });
const IDENTITY = { ty: "tr", p: still([0, 0]), a: still([0, 0]), s: still([100, 100]), r: still(0), o: still(100) };

const path = (d, placement) => contours(d, placement).map((shape) => ({ ty: "sh", ks: still(shape) }));
const ellipse = (rx, ry = rx, cx = 0, cy = 0) => [{ ty: "el", p: still([cx, cy]), s: still([rx * 2, ry * 2]) }];
const rect = ({ x, y, w, h, r = 0 }) => [{ ty: "rc", p: still([x + w / 2, y + h / 2]), s: still([w, h]), r: still(r) }];

function paint(shapes, { fill, stroke, width = 1, opacity = 100 }) {
    const items = [...shapes];
    if (stroke) items.push({ ty: "st", c: still(color(stroke)), o: still(100), w: still(width), lc: 2, lj: 2, ml: 4 });
    if (fill) items.push({ ty: "fl", c: still(color(fill)), o: still(opacity), r: 1 });
    return { ty: "gr", it: [...items, IDENTITY] };
}

const DOLLAR =
    "M308 53L251 53L251-730L308-730L308 53ZM277-68L277-68Q222-68 178-80Q134-92 103-113.5Q72-135 55.5-165Q39-195 39-233L39-233Q39-237 39-241Q39-245 40-247L40-247L174-247Q174-245 174-243Q174-241 174-239L174-239Q175-214 190-198.5Q205-183 229.5-176Q254-169 281-169L281-169Q305-169 327.5-173.5Q350-178 365.5-190Q381-202 381-221L381-221Q381-245 361.5-258Q342-271 310.5-279Q279-287 242-297L242-297Q208-305 174-315.5Q140-326 112.5-343Q85-360 68-387.5Q51-415 51-457L51-457Q51-498 69-528.5Q87-559 118.5-579Q150-599 192.5-608.5Q235-618 284-618L284-618Q330-618 370-608.5Q410-599 440-580.5Q470-562 487-534.5Q504-507 504-473L504-473Q504-466 504-460Q504-454 503-452L503-452L370-452L370-460Q370-478 359-490.5Q348-503 327.5-510Q307-517 278-517L278-517Q258-517 241.5-514Q225-511 213-505Q201-499 194.5-490.5Q188-482 188-470L188-470Q188-453 202.5-442.5Q217-432 241-425Q265-418 294-410L294-410Q330-400 369.5-390.5Q409-381 443-365Q477-349 498-319.5Q519-290 519-240L519-240Q519-192 500.5-159Q482-126 449-106Q416-86 372-77Q328-68 277-68Z";
const DOLLAR_ADVANCE = 556;
const dollar = (size, x, baseline) =>
    path(DOLLAR, { scale: size / 1000, x: x - (DOLLAR_ADVANCE * size) / 2000, y: baseline });

export const COIN_ART = [
    paint(ellipse(30), { fill: "#FFCC4D", stroke: "#C98A1E", width: 3.5 }),
    paint(ellipse(23), { stroke: "#E8A93A", width: 2.5 }),
    paint(dollar(30, 0, 10.5), { fill: "#93661D" }),
    paint(path("M-19-13A23 23 0 0 1-7-21"), { stroke: "#FFF0C2", width: 3.5 }),
];
export const BILL_ART = [
    paint(rect({ x: -34, y: -11, w: 68, h: 33, r: 7 }), { fill: "#D9EDC9", stroke: "#6FA94E", width: 1.8 }),
    paint(rect({ x: -34, y: -18, w: 68, h: 33, r: 7 }), { fill: "#A7D28B", stroke: "#6FA94E", width: 1.8 }),
    paint(dollar(13, -23, -3), { fill: "#5C913B" }),
    paint(rect({ x: -11, y: -21, w: 22, h: 36 }), { fill: "#FFE8B6", stroke: "#F3D393", width: 0.9 }),
    paint(ellipse(5.5, 5.5, 23, -2.5), { fill: "#77B255" }),
];
export const BASE_ART = [
    paint(ellipse(146, 11, 0, 44), { fill: "#000000", opacity: 16 }),
    paint(path("M-128 14V26A128 16 0 0 0 128 26V14Z"), { fill: "#9A5B38", stroke: "#6E3F22", width: 4 }),
    paint(ellipse(128, 16, 0, 14), { fill: "#C98558", stroke: "#6E3F22", width: 4 }),
    paint(ellipse(108, 11, 0, 9), { fill: "#6E3F22" }),
];
export const DOME_ART = [
    paint(path("M-112-2A112 112 0 0 1 112-2A112 15 0 0 1-112-2Z"), { fill: "#FFCC4D", stroke: "#D9932A", width: 5 }),
    paint(path("M40-106A112 112 0 0 1 110-14C102-11 90-9 76-8 88-46 76-82 40-106Z"), { fill: "#FFB52E" }),
    paint(path("M-104-16A104 12 0 0 0 104-16"), { stroke: "#F09E1B", width: 7 }),
    paint(path("M-74-60C-64-78-50-90-30-97"), { stroke: "#FFF0C2", width: 12 }),
];
export const PLUNGER_ART = [
    paint(rect({ x: -9, y: -134, w: 18, h: 26 }), { fill: "#D9932A", stroke: "#B87A1F", width: 2 }),
    paint(path("M-27-136C-27-152-13-158 0-158 13-158 27-152 27-136 27-128-27-128-27-136Z"), {
        fill: "#FFCC4D",
        stroke: "#D9932A",
        width: 4,
    }),
    paint(path("M-14-146C-10-150-6-151-2-152"), { stroke: "#FFF0C2", width: 4 }),
];
const arc = (side, radius) => {
    const x = side * radius * Math.cos(0.62);
    const y = radius * Math.sin(0.62);
    return `M${x} ${-y}A${radius} ${radius} 0 0 ${side > 0 ? 1 : 0} ${x} ${y}`;
};
export const RING_ART = [1, -1].flatMap((side) =>
    [150, 178].map((radius) => paint(path(arc(side, radius)), { stroke: "#0", width: 7 })),
);
export const CHECK_ART = [
    paint(ellipse(24), { fill: "#0" }),
    paint(path("M-11 1-3 9 12-8"), { stroke: "#1", width: 5.5 }),
];
export const GLOW_ART = [
    {
        ty: "gr",
        it: [
            ...ellipse(240, 240, BELL_X, RINGS_Y - 10),
            {
                ty: "gf",
                o: still(100),
                r: 1,
                t: 2,
                s: still([BELL_X, RINGS_Y - 10]),
                e: still([BELL_X + 240, RINGS_Y - 10]),
                g: { p: 2, k: still("#2") },
            },
            IDENTITY,
        ],
    },
];
