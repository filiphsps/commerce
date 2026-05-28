'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

export type VariantOption = { name: string; value: string };

/**
 * Syncs the selected variant options into the URL as sorted query params using
 * Next.js router, replacing `@shopify/hydrogen-react`'s `useSelectedOptionInUrlParam`
 * which calls `window.history.replaceState` with no Next.js router flags and
 * triggers an `ACTION_RESTORE` loop in Next.js 16.
 *
 * Fires only on user-driven option changes, not on initial mount, to avoid
 * polluting the initial URL load. Params are sorted alphabetically before the
 * replace so the middleware's `searchParams.sort()` guard never issues a 301
 * redirect back to the sorted URL (which was the root cause of the reload loop).
 *
 * @param options - Currently selected variant options from the product context.
 */
export function useVariantUrlSync(options: VariantOption[]): void {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const mountedRef = useRef(false);
    const prevKeyRef = useRef('');

    useEffect(() => {
        const key = options
            .map((o) => `${o.name}=${o.value}`)
            .sort()
            .join('&');

        if (!mountedRef.current) {
            mountedRef.current = true;
            prevKeyRef.current = key;
            return;
        }

        if (key === prevKeyRef.current) return;
        prevKeyRef.current = key;

        const params = new URLSearchParams(searchParams.toString());
        // Remove all existing option params and rebuild them sorted
        for (const { name } of options) {
            params.delete(name);
        }
        for (const { name, value } of options) {
            params.set(name, value);
        }
        params.sort();

        const qs = params.toString();
        router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    }, [options, pathname, router, searchParams]);
}
