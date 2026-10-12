import type { ReactNode } from "react";
import Svg, { Path } from "react-native-svg";

export function LineIcon({
    d,
    color,
    size = 19,
    strokeWidth = 1.8,
    children,
}: {
    d?: string;
    color: string;
    size?: number;
    strokeWidth?: number;
    children?: ReactNode;
}) {
    return (
        <Svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            color={color}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {d ? <Path d={d} /> : null}
            {children}
        </Svg>
    );
}

export const UP_DOWN_CHEVRON = "m3 5 3-3 3 3M3 9l3 3 3-3";

export function UpDownChevron({ color }: { color: string }) {
    return (
        <Svg width={12} height={14} viewBox="0 0 12 14">
            <Path d={UP_DOWN_CHEVRON} fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}
