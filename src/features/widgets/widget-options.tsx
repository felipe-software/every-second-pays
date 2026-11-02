import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { Raised, RaisedPressable, usePressSink } from "@/components/elevated/raised";
import { LineIcon } from "@/components/line-icon";
import { CardDivider } from "@/components/settings-card";
import { useEarningsTheme } from "@/features/earnings/theme";
import { appHaptics } from "@/features/haptics/haptics";

export type Option<T extends string> = { value: T; label: string; icon?: ReactNode };

export function choose<T extends string>(value: T, next: T, onChange: (value: T) => void) {
    if (next === value) return;
    appHaptics.selection();
    onChange(next);
}

export function OptionGroup({
    label,
    children,
    divider = true,
}: {
    label: string;
    children: ReactNode;
    divider?: boolean;
}) {
    return (
        <>
            {divider ? <CardDivider /> : null}
            <View className="px-4 pt-3.5 pb-4">
                <Text className="mb-3 font-sans text-[15.5px] font-medium text-ink">{label}</Text>
                {children}
            </View>
        </>
    );
}

function Chip({
    label,
    icon,
    selected,
    onPress,
}: {
    label: string;
    icon?: ReactNode;
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
            surface={
                selected
                    ? { face: colors.chipSelected, edge: colors.edgeChip, outline: colors.chipSelectedBorder }
                    : { face: colors.canvas, edge: colors.edgeCanvas, outline: colors.canvas }
            }
            depth={2}
            radius={20}
            selected={selected}
            className="h-10 flex-row items-center gap-[7px] pr-3.5 pl-3"
        >
            {icon}
            <Text
                className="font-sans text-[14px] font-semibold"
                style={{ color: selected ? colors.ink : colors.muted }}
            >
                {label}
            </Text>
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
        <View
            testID={testID}
            accessibilityRole="radiogroup"
            accessibilityLabel={label}
            className="flex-row flex-wrap gap-2"
        >
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
    return (
        <LineIcon d={d} color={selected ? colors.ink : colors.muted} size={16} strokeWidth={2}>
            {children}
        </LineIcon>
    );
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
            surface={
                selected
                    ? { face: colors.chipSelected, edge: colors.edgeChip, outline: colors.chipSelectedBorder }
                    : { face: colors.canvas, edge: colors.canvas, outline: colors.canvas }
            }
            flat={!selected}
            depth={2}
            radius={19}
            selected={selected}
            className="h-9 flex-row items-center justify-center gap-1.5"
        >
            {icon}
            <Text
                className="font-sans text-[13px] font-semibold"
                style={{ color: selected ? colors.ink : colors.muted }}
            >
                {label}
            </Text>
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
