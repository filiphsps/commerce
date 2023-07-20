import { useCallback, useRef, useState } from 'react';

interface useButtonCallbacksProps {
    handler: () => Promise<void>;
    cooldown?: number;
}
export function useButtonCallbacks({ handler, cooldown = 3 }: useButtonCallbacksProps) {
    const [isActive, setIsActive] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const timeout = useRef<ReturnType<typeof setTimeout>>();

    const onClick = useCallback(() => {
        if (timeout.current) clearTimeout(timeout.current);
        setIsActive(false);
        setIsLoading(true);

        // FIXME: Handle errors properly
        handler().then(() => {
            setIsLoading(false);

            setIsActive(true);
            timeout.current = setTimeout(() => {
                setIsActive(false);
            }, cooldown * 1000);
        });
    }, [cooldown]);

    return { isActive, isLoading, onClick };
}
