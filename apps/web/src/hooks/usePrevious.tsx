//https://stackoverflow.com/a/57706747/3142553

import { useEffect, useRef } from 'react';

export const usePrevious = <T,>(value: T): T | undefined => {
    const ref = useRef<T>();

    useEffect(() => {
        ref.current = value;
    }, []);

    useEffect(() => {
        // Don't du a full compare, eg ===
        if (ref.current == value) {
            return;
        }

        ref.current = value;
    }, [value]);
    return ref.current;
};
