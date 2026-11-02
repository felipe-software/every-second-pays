import { Circle, G, Path } from "react-native-svg";

const ICON_SIZE = 16;

export function EndIcon({ x, y, kind, color }: { x: number; y: number; kind: "sun" | "moon"; color: string }) {
    return (
        <G transform={`translate(${x - ICON_SIZE / 2} ${y - ICON_SIZE / 2}) scale(${ICON_SIZE / 24})`}>
            {kind === "sun" ? (
                <>
                    <Circle cx={12} cy={12} r={4.5} fill={color} />
                    <Path
                        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
                        stroke={color}
                        strokeWidth={2}
                        strokeLinecap="round"
                    />
                </>
            ) : (
                <Path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z" fill={color} />
            )}
        </G>
    );
}
