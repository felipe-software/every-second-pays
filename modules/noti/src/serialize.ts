import { Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { compileRuntimeFrames } from "./runtime-frames";
import { colorPattern, finite, rem } from "./scene-values";
import type {
    ButtonProps,
    ChronometerProps,
    GridProps,
    ImageProps,
    LoopProps,
    NotiStyle,
    ProgressProps,
    ScrollViewProps,
    SerializedNode,
    ViewFlipperProps,
    ViewProps,
} from "./types";

export { compileRuntimeFrames, rem };

// Each branch reads only what its own primitive declares and validates it before trusting it.
type SceneProps = ViewProps &
    GridProps &
    ButtonProps &
    ImageProps &
    ProgressProps &
    ChronometerProps &
    ScrollViewProps &
    ViewFlipperProps &
    LoopProps;
type SceneContext = { count: number; ids: Set<string> };

const lengths = new Set([
    "top",
    "right",
    "bottom",
    "left",
    "padding",
    "paddingHorizontal",
    "paddingVertical",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "gap",
    "borderRadius",
    "fontSize",
    "translateX",
    "translateY",
    "elevation",
]);
const signedLengths = ["top", "right", "bottom", "left", "translateX", "translateY"];
const numericTransforms = new Set(["scale", "scaleX", "scaleY", "rotate"]);
const fields = new Set([
    ...lengths,
    ...numericTransforms,
    "position",
    "anchor",
    "width",
    "height",
    "backgroundColor",
    "opacity",
    "color",
    "fontWeight",
    "textAlign",
    "verticalAlign",
    "justifyContent",
    "alignItems",
]);
const animationName = /^[a-z][a-zA-Z0-9_]*$/;

function serializeLength(name: string, value: string | number): string | number {
    const dimension = name === "width" || name === "height";
    const converted = dimension && (value === "auto" || value === "100%") ? value : rem(value, name);
    if (typeof converted === "number" && converted < 0 && !signedLengths.includes(name))
        throw new Error(`${name} cannot be negative.`);
    return converted;
}

function serializeStyleValue(name: string, value: string | number): string | number {
    if (lengths.has(name) || name === "width" || name === "height") return serializeLength(name, value);
    if (name === "opacity") return finite(value, "opacity", 0, 1);
    if (numericTransforms.has(name)) return finite(value, name, name === "rotate" ? -36000 : 0, 36000);
    return value;
}

function serializeStyle(input: NotiStyle = {}): SerializedNode["style"] {
    const output: SerializedNode["style"] = {};
    for (const [name, value] of Object.entries(input)) {
        if (!fields.has(name)) throw new Error(`Unsupported notification style: ${name}`);
        if (value === undefined) continue;
        output[name] = serializeStyleValue(name, value);
    }
    return output;
}

function flatten(children: ReactNode): ReactNode[] {
    if (Array.isArray(children)) return children.flatMap(flatten);
    if (children === null || children === undefined || typeof children === "boolean") return [];
    if (isValidElement<{ children?: ReactNode }>(children) && children.type === Fragment)
        return flatten(children.props.children);
    return [children];
}

function isTextChild(value: ReactNode): value is string | number {
    return typeof value === "string" || typeof value === "number";
}

function serializeText(node: SerializedNode, props: SceneProps, children: ReactNode[]): void {
    if (!children.every(isTextChild))
        throw new Error(`Noti.${node.type === "button" ? "Button" : "Text"} accepts text and numbers only.`);
    node.text = children.join("");
    node.numberOfLines = props.numberOfLines ?? 1;
    if (!Number.isInteger(node.numberOfLines) || node.numberOfLines < 1 || node.numberOfLines > 10)
        throw new Error("numberOfLines must be 1–10.");
    if (node.type === "button" && !node.onPress) throw new Error("Noti.Button requires onPress.");
}

function serializeImage(node: SerializedNode, props: SceneProps): void {
    if (
        typeof props.source !== "string" ||
        !/^(data:image\/[\w.+-]+;base64,|file:\/\/|content:\/\/)/.test(props.source)
    )
        throw new Error("Image source must be a base64 data URI, file URI or content URI.");
    node.source = props.source;
    node.resizeMode = props.resizeMode ?? "cover";
    if (!["cover", "contain", "stretch"].includes(node.resizeMode)) throw new Error("Invalid resizeMode.");
}

function serializeProgress(node: SerializedNode, props: SceneProps): void {
    node.max = finite(props.max ?? 100, "max", 1, 1_000_000);
    node.value = finite(props.value, "value", 0, node.max);
    node.indeterminate = props.indeterminate === true;
    for (const name of ["color", "trackColor"] as const) {
        const value = props[name];
        if (value !== undefined && (typeof value !== "string" || !colorPattern.test(value)))
            throw new Error(`${name} must use #RRGGBB or #RRGGBBAA.`);
        node[name] = value;
    }
}

function serializeChronometer(node: SerializedNode, props: SceneProps): void {
    node.base = finite(props.base, "base", 0, Number.MAX_SAFE_INTEGER);
    node.started = props.started !== false;
    node.countDown = props.countDown === true;
    node.format = typeof props.format === "string" ? props.format : undefined;
}

function serializeLayout(
    node: SerializedNode,
    props: SceneProps,
    children: ReactNode[],
    visitChild: (child: ReactNode, index: number) => SerializedNode,
): void {
    node.direction = node.type === "presence" || node.type === "crossfade" ? "overlay" : (props.direction ?? "column");
    if (!["row", "column", "overlay"].includes(node.direction)) throw new Error("Invalid layout direction.");
    node.children = children.map(visitChild);
    if (node.children.some((value) => value.style.position === "absolute") && node.direction !== "overlay")
        throw new Error('Absolute children require a Noti.View with direction="overlay".');
    if (new Set(node.children.map((value) => value.key)).size !== node.children.length)
        throw new Error("Sibling notification keys must be unique.");
}

function serializeContent(
    node: SerializedNode,
    props: SceneProps,
    children: ReactNode[],
    visitChild: (child: ReactNode, index: number) => SerializedNode,
): void {
    const { type } = node;
    if (type === "text" || type === "button") serializeText(node, props, children);
    else if (type === "image") serializeImage(node, props);
    else if (type === "progress") serializeProgress(node, props);
    else if (type === "chronometer") serializeChronometer(node, props);
    else if (type !== "spacer") serializeLayout(node, props, children, visitChild);
}

function serializeGrid(node: SerializedNode, props: SceneProps): void {
    node.columns = finite(props.columns, "columns", 1, 6);
    node.rows = props.rows === undefined ? undefined : finite(props.rows, "rows", 1, 8);
    if (!Number.isInteger(node.columns) || (node.rows !== undefined && !Number.isInteger(node.rows)))
        throw new Error("Grid rows and columns must be integers.");
}

function serializeScrollAutoPlay(node: SerializedNode, props: SceneProps, windowSize: number): void {
    if (node.children.length <= windowSize || node.children.length > 12)
        throw new Error("Auto-playing ScrollView requires windowSize + 1 to 12 rows.");
    node.interval = finite(props.interval ?? 1400, "interval", 100, 60000);
    if (!Number.isInteger(node.interval)) throw new Error("ScrollView interval must be an integer.");
}

function serializeScroll(node: SerializedNode, props: SceneProps): void {
    if (!props.id) throw new Error("Noti.ScrollView requires an id.");
    node.itemHeight = rem(props.itemHeight, "itemHeight");
    node.windowSize = props.windowSize ?? 3;
    node.index = props.index ?? 0;
    if (node.itemHeight <= 0 || !Number.isInteger(node.windowSize) || node.windowSize < 1 || node.windowSize > 7)
        throw new Error("ScrollView needs positive itemHeight and windowSize 1–7.");
    if (
        !Number.isInteger(node.index) ||
        node.index < 0 ||
        node.index > Math.max(0, node.children.length - node.windowSize)
    )
        throw new Error("ScrollView index is outside its content window.");
    node.autoPlay = props.autoPlay === true;
    if (node.autoPlay) serializeScrollAutoPlay(node, props, node.windowSize);
    node.style.height = node.itemHeight * node.windowSize;
}

function serializeFlipper(node: SerializedNode, props: SceneProps): void {
    if (node.children.length < 2 || node.children.length > 12) throw new Error("Noti.ViewFlipper needs 2–12 children.");
    node.interval = finite(props.interval ?? 1400, "interval", 100, 60000);
    node.index = finite(props.index ?? 0, "index", 0, node.children.length - 1);
    node.autoPlay = props.autoPlay !== false;
    node.animation = node.animation ?? "fade";
    if (!Number.isInteger(node.interval) || !Number.isInteger(node.index))
        throw new Error("ViewFlipper interval and index must be integers.");
}

function serializeLoop(node: SerializedNode, props: SceneProps): void {
    if (node.children.length !== 1) throw new Error("Noti.Loop requires exactly one child.");
    const runtime = compileRuntimeFrames(props.from, props.animate, props.transition);
    node.runtimeFrames = runtime.frames;
    node.interval = runtime.interval;
}

function registerId(ids: Set<string>, id: string | undefined): void {
    if (!id) return;
    if (ids.has(id)) throw new Error(`Duplicate notification node id: ${id}`);
    ids.add(id);
}

function visit(context: SceneContext, input: ReactNode, path: string, depth: number): SerializedNode {
    if (++context.count > 96 || depth > 7)
        throw new Error("Notification scenes support up to 96 nodes and 7 nesting levels.");
    if (!isValidElement<SceneProps>(input)) throw new Error("Use Noti.Text for notification text.");
    const child: ReactElement<SceneProps, any> = input;
    const type: SerializedNode["type"] | undefined = child.type.notificationPrimitive;
    if (!type)
        throw new Error(
            "Only Noti primitives and React fragments are supported. Call scene helpers before passing their result.",
        );
    const props = child.props;
    registerId(context.ids, props.id);
    const node: SerializedNode = {
        type,
        key: child.key === null ? path : child.key,
        id: props.id,
        style: serializeStyle(props.style),
        animation: props.animation,
        enter: props.enter,
        exit: props.exit,
        transitionKey: props.transitionKey,
        accessibilityLabel: props.accessibilityLabel,
        onPress: props.onPress,
        children: [],
    };
    for (const name of [node.animation, node.enter, node.exit]) {
        if (name && !animationName.test(name)) throw new Error("Invalid animation name.");
    }
    serializeContent(node, props, flatten(props.children), (value, index) =>
        visit(context, value, `${path}.${index}`, depth + 1),
    );
    if (type === "grid") serializeGrid(node, props);
    if (type === "scroll") serializeScroll(node, props);
    if (type === "flipper") serializeFlipper(node, props);
    if (type === "loop") serializeLoop(node, props);
    return node;
}

export function serializeScene(scene: ReactNode): SerializedNode {
    const roots = flatten(scene);
    if (roots.length !== 1) throw new Error("A notification scene needs exactly one root Noti component.");
    return visit({ count: 0, ids: new Set() }, roots[0], "root", 0);
}
