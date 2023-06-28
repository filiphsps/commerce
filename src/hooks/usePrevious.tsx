//https://stackoverflow.com/a/57706747/3142553

import { useEffect, useRef } from 'react';

export const usePrevious = <T,>(value: T): T | undefined => {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
};
