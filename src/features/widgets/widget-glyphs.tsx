import Svg, { Circle, Path, Rect } from "react-native-svg";

export function BackChevron({ color }: { color: string }) {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path d="M15 5 8 12l7 7" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

export function ForwardChevron({ color }: { color: string }) {
    return (
        <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="m9 5 7 7-7 7" fill="none" stroke={color} strokeOpacity={0.6} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

export function WidgetsIcon({ accent, ink }: { accent: string; ink: string }) {
    return (
        <Svg width={26} height={26} viewBox="0 0 26 26">
            <Rect x={2} y={8} width={22} height={15} rx={4.5} fill="none" stroke={ink} strokeWidth={1.8} />
            <Rect x={7} y={14} width={12} height={4} rx={2} fill={ink} />
            <Circle cx={18} cy={5} r={3.5} fill={accent} />
        </Svg>
    );
}
