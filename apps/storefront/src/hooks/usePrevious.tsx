import { useState } from 'react';

/**
 * Returns the previous distinct value of a variable. While `value` stays
 * referentially equal across renders, the returned value remains the last
 * value that was different from it.
 *
 * @param {T} value - The value to track
 * @returns {T | undefined} - The previous value
 */
export const usePrevious = <T,>(value: T): T | undefined => {
    const [current, setCurrent] = useState<T>(value);
    const [previous, setPrevious] = useState<T | undefined>(undefined);

    if (current !== value) {
        setCurrent(value);
        setPrevious(current);
    }

    return previous;
};
