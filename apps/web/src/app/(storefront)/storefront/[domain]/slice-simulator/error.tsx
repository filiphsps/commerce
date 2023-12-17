'use client';

import { useEffect } from 'react';

/* c8 ignore start */
export default function Error({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => console.error(error), [error]);
    return <code>{JSON.stringify(error, null, 4)}</code>;
}
/* c8 ignore stop */
