import { type ReactNode, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
    Easing,
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";

import { CheckIcon } from "@/components/check-icon";
import { PopIn } from "@/components/elevated/pop-in";
import { Raised, RaisedPressable, usePressSink } from "@/components/elevated/raised";
import { LineIcon } from "@/components/line-icon";
import { Card, CardDivider, IconTile, usePressHighlight } from "@/components/settings-card";
import { edgeColor, useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";

export type Option<T extends string> = { value: T; label: string; icon?: ReactNode };

const EXPAND_TIMING = { duration: 240, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };
const SWITCH_TIMING = { duration: 180, easing: Easing.bezier(0.2, 0.8, 0.3, 1), reduceMotion: ReduceMotion.System };

function choose<T extends string>(value: T, next: T, onChange: (value: T) => void) {
    if (next === value) return;
    appHaptics.selection();
    onChange(next);
}

export function CollapsibleCard({
    icon,
    title,
    testID,
    children,
}: {
    icon: string;
    title: string;
    testID?: string;
    children: ReactNode;
}) {
    const { colors } = useEarningsTheme();
    const [open, setOpen] = useState(false);
    const [opened, setOpened] = useState(false);
    const highlight = usePressHighlight();
    const progress = useSharedValue(0);
    const contentHeight = useSharedValue(0);
    const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${progress.get() * 180}deg` }] }));
    const bodyStyle = useAnimatedStyle(() => ({
        height: contentHeight.get() * progress.get(),
        opacity: progress.get(),
    }));

    useEffect(() => {
        progress.set(withTiming(open ? 1 : 0, EXPAND_TIMING));
    }, [open, progress]);

    return (
        <View className="mt-3">
            <Card className="overflow-hidden">
                <Pressable
                    testID={testID}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => {
                        appHaptics.selection();
                        setOpened(true);
                        setOpen((value) => !value);
                    }}
                    onPressIn={highlight.onPressIn}
                    onPressOut={highlight.onPressOut}
                    android_ripple={highlight.android_ripple}
                    className="min-h-[60px] flex-row items-center gap-3 px-4"
                    style={highlight.style}
                >
                    <IconTile>
                        <LineIcon d={icon} color={colors.accentDeep} />
                    </IconTile>
                    <Text className="flex-1 font-sans text-[16px] font-semibold tracking-[-0.2px] text-ink">{title}</Text>
                    <Animated.View style={[{ opacity: 0.6 }, chevronStyle]}>
                        <LineIcon d="m6 9 6 6 6-6" color={colors.ink} size={18} strokeWidth={2.2} />
                    </Animated.View>
                </Pressable>
                <Animated.View
                    pointerEvents={open ? "auto" : "none"}
                    importantForAccessibility={open ? "auto" : "no-hide-descendants"}
                    accessibilityElementsHidden={!open}
                    className="overflow-hidden"
                    style={bodyStyle}
                >
                    <View
                        className="absolute inset-x-0 top-0"
                        onLayout={(event) => contentHeight.set(event.nativeEvent.layout.height)}
                    >
                        {opened ? children : null}
                    </View>
                </Animated.View>
            </Card>
        </View>
    );
}

export function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
    return (
        <>
            <CardDivider />
            <View className="px-4 pt-3.5 pb-4">
                <Text className="mb-3 font-sans text-[15.5px] font-medium text-ink">{label}</Text>
                {children}
            </View>
        </>
    );
}

function Chip({ label, icon, selected, onPress }: { label: string; icon?: ReactNode; selected: boolean; onPress: () => void }) {
    const { colors } = useEarningsTheme();
    return (
        <RaisedPressable
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected }}
            onPress={onPress}
            surface={selected
                ? { face: colors.chipSelected, edge: colors.edgeChip, outline: colors.chipSelectedBorder }
                : { face: colors.canvas, edge: colors.edgeCanvas, outline: colors.canvas }}
            depth={2}
            radius={20}
            selected={selected}
            className="h-10 flex-row items-center gap-[7px] pr-3.5 pl-3"
        >
            {icon}
            <Text className="font-sans text-[14px] font-semibold" style={{ color: selected ? colors.ink : colors.muted }}>{label}</Text>
        </RaisedPressable>
    );
}

export function OptionChips<T extends string>({
    label,
    options,
    value,
    onChange,
    testID,
}: {
    label: string;
    options: readonly Option<T>[];
    value: T;
    onChange: (value: T) => void;
    testID?: string;
}) {
    return (
        <View testID={testID} accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-2">
            {options.map((option) => (
                <Chip
                    key={option.value}
                    label={option.label}
                    icon={option.icon}
                    selected={option.value === value}
                    onPress={() => choose(value, option.value, onChange)}
                />
            ))}
        </View>
    );
}

export function ChipIcon({ d, children, selected }: { d?: string; children?: ReactNode; selected: boolean }) {
    const { colors } = useEarningsTheme();
    return <LineIcon d={d} color={selected ? colors.ink : colors.muted} size={16} strokeWidth={2}>{children}</LineIcon>;
}

function Segment({
    label,
    icon,
    selected,
    onPress,
}: {
    label: string;
    icon: ReactNode;
    selected: boolean;
    onPress: () => void;
}) {
    const { colors } = useEarningsTheme();
    return (
        <RaisedPressable
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected }}
            onPress={onPress}
            containerClassName="flex-1"
            surface={selected
                ? { face: colors.chipSelected, edge: colors.edgeChip, outline: colors.chipSelectedBorder }
                : { face: colors.canvas, edge: colors.canvas, outline: colors.canvas }}
            flat={!selected}
            depth={2}
            radius={19}
            selected={selected}
            className="h-9 flex-row items-center justify-center gap-1.5"
        >
            {icon}
            <Text className="font-sans text-[13px] font-semibold" style={{ color: selected ? colors.ink : colors.muted }}>{label}</Text>
        </RaisedPressable>
    );
}

export function SizeSegments<T extends string>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: readonly (Option<T> & { glyph: { width: number; height: number } })[];
    value: T;
    onChange: (value: T) => void;
}) {
    const { colors } = useEarningsTheme();
    return (
        <View testID="widget-preview-size" accessibilityRole="radiogroup" accessibilityLabel={label}>
            <View className="flex-row gap-0.5 rounded-[23px] p-[3px]" style={{ backgroundColor: colors.canvas }}>
                {options.map((option) => {
                    const selected = option.value === value;
                    const { width, height } = option.glyph;
                    return (
                        <Segment
                            key={option.value}
                            label={option.label}
                            selected={selected}
                            onPress={() => choose(value, option.value, onChange)}
                            icon={
                                <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                                    <Rect
                                        x={1}
                                        y={1}
                                        width={width - 2}
                                        height={height - 2}
                                        rx={2.5}
                                        fill="none"
                                        stroke={selected ? colors.ink : colors.muted}
                                        strokeWidth={1.6}
                                    />
                                </Svg>
                            }
                        />
                    );
                })}
            </View>
        </View>
    );
}

function PickerTile({
    label,
    art,
    height,
    selected,
    onPress,
    testID,
}: {
    label: string;
    art: ReactNode;
    height: number;
    selected: boolean;
    onPress: () => void;
    testID?: string;
}) {
    const { colors } = useEarningsTheme();
    const sink = usePressSink();
    return (
        <Pressable
            testID={testID}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected }}
            onPress={onPress}
            onPressIn={sink.onPressIn}
            onPressOut={sink.onPressOut}
            className="min-w-0 flex-1 gap-2"
        >
            <Raised
                surface={{
                    face: colors.canvas,
                    edge: selected ? colors.edgeChip : colors.edgeCanvas,
                    outline: selected ? colors.chipSelectedBorder : colors.canvas,
                }}
                depth={2}
                radius={14}
                selected={selected}
                pressed={sink.pressed}
                ripple={sink.ripple}
                className="overflow-hidden"
                style={{ height, borderWidth: 2 }}
            >
                {art}
            </Raised>
            <Text
                numberOfLines={1}
                className="text-center font-sans text-[13px] font-semibold"
                style={{ color: selected ? colors.ink : colors.muted }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

export function PickerTiles<T extends string>({
    label,
    options,
    value,
    onChange,
    height,
    testID,
}: {
    label: string;
    options: readonly (Option<T> & { art: ReactNode })[];
    value: T;
    onChange: (value: T) => void;
    height: number;
    testID?: string;
}) {
    return (
        <View testID={testID} accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row gap-2.5">
            {options.map((option) => (
                <PickerTile
                    key={option.value}
                    testID={testID ? `${testID}-${option.value}` : undefined}
                    label={option.label}
                    art={option.art}
                    height={height}
                    selected={option.value === value}
                    onPress={() => choose(value, option.value, onChange)}
                />
            ))}
        </View>
    );
}

function Swatch({ label, color, selected, onPress, children }: { label: string; color: string; selected: boolean; onPress: () => void; children?: ReactNode }) {
    const sink = usePressSink();
    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected }}
            onPress={onPress}
            onPressIn={sink.onPressIn}
            onPressOut={sink.onPressOut}
            className="h-[46px] w-[46px] items-center justify-center rounded-full"
            style={{ borderColor: selected ? color : "transparent", borderWidth: 2 }}
        >
            <Raised
                surface={{ face: color, edge: edgeColor(color, { accent: true }) }}
                depth={3}
                radius={17}
                selected={selected}
                pressed={sink.pressed}
                ripple={sink.ripple}
                className="h-[34px] w-[34px] items-center justify-center overflow-hidden"
            >
                {children}
                <View className="absolute">
                    <PopIn visible={selected}>
                        <CheckIcon size={16} color="#FFFFFF" />
                    </PopIn>
                </View>
            </Raised>
        </Pressable>
    );
}

export function SwatchRow<T extends string>({
    label,
    appValue,
    appLabel,
    appColor,
    swatches,
    value,
    onChange,
}: {
    label: string;
    appValue: T;
    appLabel: string;
    appColor: string;
    swatches: readonly { value: T; label: string; color: string }[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <View className="flex-row justify-between" accessibilityRole="radiogroup" accessibilityLabel={label}>
            <Swatch label={appLabel} color={appColor} selected={value === appValue} onPress={() => choose(value, appValue, onChange)}>
                <View className="absolute top-0 right-0 h-full w-1/2" style={{ backgroundColor: "#00000038" }} />
            </Swatch>
            {swatches.map((swatch) => (
                <Swatch
                    key={swatch.value}
                    label={swatch.label}
                    color={swatch.color}
                    selected={swatch.value === value}
                    onPress={() => choose(value, swatch.value, onChange)}
                />
            ))}
        </View>
    );
}

export function SwitchRow({
    label,
    value,
    onChange,
    disabled = false,
    testID,
}: {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    testID?: string;
}) {
    const { colors } = useEarningsTheme();
    const highlight = usePressHighlight();
    const progress = useSharedValue(value ? 1 : 0);
    const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.get() * 18 }] }));

    useEffect(() => {
        progress.set(withTiming(value ? 1 : 0, SWITCH_TIMING));
    }, [progress, value]);

    return (
        <>
            <CardDivider />
            <Pressable
                testID={testID}
                accessibilityRole="switch"
                accessibilityLabel={label}
                accessibilityState={{ checked: value, disabled }}
                disabled={disabled}
                onPress={() => {
                    appHaptics.selection();
                    onChange(!value);
                }}
                onPressIn={highlight.onPressIn}
                onPressOut={highlight.onPressOut}
                android_ripple={highlight.android_ripple}
                className="min-h-[54px] flex-row items-center gap-3 px-4"
                style={[highlight.style, { opacity: disabled ? 0.5 : 1 }]}
            >
                <Text className="flex-1 font-sans text-[15.5px] font-medium text-ink">{label}</Text>
                <View className="h-7 w-[46px] justify-center rounded-[14px] px-[3px]" style={{ backgroundColor: value ? colors.accent : colors.track }}>
                    <Animated.View
                        className="h-[22px] w-[22px] rounded-full bg-white"
                        style={[{ boxShadow: "0 1px 3px rgba(0, 0, 0, 0.25)" }, knobStyle]}
                    />
                </View>
            </Pressable>
        </>
    );
}
