export const colorPattern = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

export function rem(value: unknown, name: string): number {
    if (value === 0) return 0;
    if (typeof value !== "string" || !/^-?(?:\d+(?:\.\d+)?|\.\d+)rem$/.test(value)) {
        throw new Error(`${name} must be a rem length, for example "1rem", or 0.`);
    }
    const result = parseFloat(value) * 16;
    if (!Number.isFinite(result) || Math.abs(result) > 8192) throw new Error(`${name} is out of range.`);
    return result;
}

export function finite(value: unknown, name: string, minimum: number, maximum: number): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum)
        throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
    return value;
}
