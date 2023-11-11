'use client';

import Heading from '@/components/typography/heading';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => console.error(error), [error]);
    return (
        <div>
            <Heading title={`Error: ${error?.name}`} subtitle={`${error.message}`} />
            <code>{error.stack}</code>
            <button onClick={reset}>try again</button>
        </div>
    );
}
