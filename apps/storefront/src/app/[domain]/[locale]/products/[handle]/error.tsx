'use client';

import { useEffect } from 'react';
import { Button } from '@/components/actionable/button';

export default function ProductPageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('[storefront/products/error]', error);
    }, [error]);

    return (
        <main className="mx-auto max-w-screen-md p-6 text-center">
            <h1 className="text-xl font-semibold">Something went wrong loading this product.</h1>
            <p className="mt-2 text-sm opacity-70">
                Try refreshing the page. If the problem persists we'll be looking into it.
            </p>
            <Button type="button" onClick={reset} className="mt-4">
                Try again
            </Button>
        </main>
    );
}
