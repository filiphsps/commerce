'use client';

import { useEffect } from 'react';
import { Button } from '@/components/actionable/button';

export default function ProductPageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        // Pull plain fields out — the `error` object can carry frames / cause
        // chains that reference tainted values (e.g. Shopify private tokens
        // surfaced via `experimental_taintUniqueValue`), which would re-trip
        // the taint guard inside `console.error`'s stringify step.
        console.error('[storefront/products/error]', {
            message: error.message,
            digest: error.digest,
        });
    }, [error]);

    return (
        <main className="mx-auto max-w-3xl p-6 text-center">
            <h1 className="font-semibold text-xl">Something went wrong loading this product.</h1>
            <p className="mt-2 text-sm opacity-70">
                Try refreshing the page. If the problem persists we'll be looking into it.
            </p>
            <Button type="button" onClick={reset} className="mt-4">
                Try again
            </Button>
        </main>
    );
}
