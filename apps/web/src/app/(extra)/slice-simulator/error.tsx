'use client';

/* c8 ignore start */
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => console.error(error), [error]);
    return <code>{JSON.stringify(error, null, 4)}</code>;
}
/* c8 ignore stop */
