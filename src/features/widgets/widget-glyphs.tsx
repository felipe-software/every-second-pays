import Svg, { Path } from "react-native-svg";

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

