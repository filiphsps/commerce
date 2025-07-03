import { useEffect, useRef } from 'react';

/**
 * Returns the previous value of a variable.
 *
 * @param {T} value - The value to track
 * @returns {T | undefined} - The previous value
 */
export const usePrevious = <T,>(value: T): T | undefined => {
    const ref = useRef<T | undefined>(undefined);

    useEffect(() => {
        ref.current = value;
    }); /*, [value]*/

    return ref.current;
};
