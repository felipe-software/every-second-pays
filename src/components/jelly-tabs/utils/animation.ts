import { clamp, type SharedValue } from "react-native-reanimated";

const SPRING_REST_EPSILON = 0.0001;
const MILLISECONDS_PER_SECOND = 1_000;
const MAX_FRAME_DELTA_SECONDS = 0.064;
const EASE_OUT_CONTROL_POINT_X = 0.58;
const EASE_OUT_SEARCH_ITERATIONS = 10;
const PANEL_OFFSET_DISTANCE = 4;

export interface SpringConfig {
    dampingRatio: number;
    stiffness: number;
}

export interface SpringStep {
    value: number;
    velocity: number;
}

export interface SharedSpring {
    value: SharedValue<number>;
    velocity: SharedValue<number>;
}

interface SpringMotion {
    deltaSeconds: number;
    displacement: number;
    target: number;
    velocity: number;
}

const isSpringAtRest = (displacement: number, velocity: number) => {
    "worklet";

    return Math.abs(displacement) < SPRING_REST_EPSILON && Math.abs(velocity) < SPRING_REST_EPSILON;
};

const advanceCriticalSpring = (motion: SpringMotion, naturalFrequency: number): SpringStep => {
    "worklet";

    const { deltaSeconds, displacement, target, velocity } = motion;
    const decay = Math.exp(-naturalFrequency * deltaSeconds);
    const coefficient = velocity + naturalFrequency * displacement;

    return {
        value: target + (displacement + coefficient * deltaSeconds) * decay,
        velocity: (velocity - naturalFrequency * coefficient * deltaSeconds) * decay,
    };
};

const advanceNonCriticalSpring = (motion: SpringMotion, config: SpringConfig, naturalFrequency: number): SpringStep => {
    "worklet";

    const { deltaSeconds, displacement, target, velocity } = motion;
    const squaredRatio = config.dampingRatio * config.dampingRatio;
    // Ratios above 1 need the hyperbolic mirror: the underdamped sqrt would be NaN.
    const isOverdamped = config.dampingRatio > 1;
    const dampingFrequency = config.dampingRatio * naturalFrequency;
    const dampedFrequency = naturalFrequency * Math.sqrt(isOverdamped ? squaredRatio - 1 : 1 - squaredRatio);
    const decay = Math.exp(-dampingFrequency * deltaSeconds);
    const angle = dampedFrequency * deltaSeconds;
    const cosine = isOverdamped ? Math.cosh(angle) : Math.cos(angle);
    const sine = isOverdamped ? Math.sinh(angle) : Math.sin(angle);
    const positionCoefficient = (velocity + dampingFrequency * displacement) / dampedFrequency;
    const velocityCoefficient = (dampingFrequency * velocity + config.stiffness * displacement) / dampedFrequency;

    return {
        value: target + decay * (displacement * cosine + positionCoefficient * sine),
        velocity: decay * (velocity * cosine - velocityCoefficient * sine),
    };
};

// Analytical solution of Compose's unit-mass SpringSpec, which stays stable at 60 Hz and 120 Hz.
const advanceSpring = (motion: SpringMotion, config: SpringConfig): SpringStep => {
    "worklet";

    if (isSpringAtRest(motion.displacement, motion.velocity)) {
        return { value: motion.target, velocity: 0 };
    }

    const naturalFrequency = Math.sqrt(config.stiffness);
    if (config.dampingRatio === 1) {
        return advanceCriticalSpring(motion, naturalFrequency);
    }

    return advanceNonCriticalSpring(motion, config, naturalFrequency);
};

export const advanceSharedSpring = (
    spring: SharedSpring,
    target: number,
    config: SpringConfig,
    deltaSeconds: number,
) => {
    "worklet";

    const next = advanceSpring(
        {
            deltaSeconds,
            displacement: spring.value.value - target,
            target,
            velocity: spring.velocity.value,
        },
        config,
    );
    spring.value.value = next.value;
    spring.velocity.value = next.velocity;
};

export const getFrameDeltaSeconds = (timeSincePreviousFrame: number | null) => {
    "worklet";

    if (timeSincePreviousFrame === null) {
        return null;
    }

    return Math.min(timeSincePreviousFrame / MILLISECONDS_PER_SECOND, MAX_FRAME_DELTA_SECONDS);
};

const evaluateCubicBezierCoordinate = (parameter: number, secondControlPoint: number) => {
    "worklet";

    const parameterSquared = parameter * parameter;
    const inverse = 1 - parameter;

    return parameterSquared * (3 * inverse * secondControlPoint + parameter);
};

// Compose's EaseOut is CubicBezierEasing(0, 0, 0.58, 1).
const easeOut = (input: number) => {
    "worklet";

    const x = clamp(input, 0, 1);
    let low = 0;
    let high = 1;
    let parameter = x;

    for (let iteration = 0; iteration < EASE_OUT_SEARCH_ITERATIONS; iteration += 1) {
        const bezierX = evaluateCubicBezierCoordinate(parameter, EASE_OUT_CONTROL_POINT_X);

        if (bezierX < x) {
            low = parameter;
        } else {
            high = parameter;
        }
        parameter = (low + high) / 2;
    }

    return evaluateCubicBezierCoordinate(parameter, 1);
};

export const getHorizontalPanelOffset = (rawOffset: number, trackWidth: number, geometryScale: number) => {
    "worklet";

    if (trackWidth <= 0) {
        return 0;
    }

    const fraction = clamp(rawOffset / trackWidth, -1, 1);
    if (fraction === 0) {
        return 0;
    }

    return Math.sign(fraction) * PANEL_OFFSET_DISTANCE * geometryScale * easeOut(Math.abs(fraction));
};

export const getTabWidth = (trackWidth: number, trackInset: number, tabCount: number) => {
    "worklet";

    if (tabCount <= 0) {
        return 0;
    }

    return Math.max(0, (trackWidth - trackInset * 2) / tabCount);
};

export const getMaxTabIndex = (tabCount: number) => {
    "worklet";

    return Math.max(0, tabCount - 1);
};

export const rubberBand = (distance: number, dimension: number, coefficient: number) => {
    "worklet";

    if (distance === 0) {
        return 0;
    }

    const absoluteDistance = Math.abs(distance);
    const dampedDistance = (1 - 1 / ((absoluteDistance * coefficient) / dimension + 1)) * dimension;

    return Math.sign(distance) * dampedDistance;
};

export const getPointerOrigin = (
    currentAbsolutePosition: number,
    dimension: number,
    initialAbsolutePosition: number,
    initialLocalPosition: number,
) => {
    "worklet";

    const pointerPosition = initialLocalPosition + (currentAbsolutePosition - initialAbsolutePosition);

    return clamp(pointerPosition, 0, dimension);
};
