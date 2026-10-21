/* eslint-disable react-hooks/refs */
import { useRef } from "react";

const shallowEqual = (a: object, b: object) => {
    const aKeys = Object.keys(a);
    if (aKeys.length !== Object.keys(b).length) {
        return false;
    }

    return aKeys.every(
        (key) =>
            Object.prototype.hasOwnProperty.call(b, key) &&
            Object.is(
                (a as Record<string, unknown>)[key],
                (b as Record<string, unknown>)[key],
            ),
    );
};

/**
 * Keeps the previous object reference while the next object has the same
 * own keys and values, so inline prop objects do not invalidate memos.
 */
export function useShallowStable<T extends object | undefined>(next: T): T {
    const ref = useRef(next);
    const previous = ref.current;

    if (
        previous !== next &&
        (previous === undefined ||
            next === undefined ||
            !shallowEqual(previous, next))
    ) {
        ref.current = next;
    }

    return ref.current;
}
