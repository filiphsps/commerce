'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => console.error(error), [error]);
    return (
        <div>
            <h1>ERROR</h1>
            <button onClick={reset}>try again</button>
        </div>
    );
}
