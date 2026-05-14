import type { Error } from '@nordcom/commerce-errors';
import { useCart } from '@shopify/hydrogen-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import type { Locale } from '@/utils/locale';

// Pull a human-ish message out of whatever shape Hydrogen-React handed us in
// `cart.error`. The error is `unknown` per the type — historically it has been
// either a GraphQL response with `errors[].message`, a Shopify `userErrors`
// list, or a fetch error. We never want to render `[object Object]` at a user.
const formatCartError = (error: unknown): string | null => {
    if (error == null) return null;
    if (typeof error === 'string') return error;
    if (typeof error !== 'object') return String(error);
    const e = error as { message?: unknown; errors?: unknown; userErrors?: unknown };
    if (typeof e.message === 'string') return e.message;
    if (Array.isArray(e.errors)) {
        const msg = e.errors.find((x) => typeof x?.message === 'string')?.message;
        if (msg) return String(msg);
    }
    if (Array.isArray(e.userErrors)) {
        const msg = e.userErrors.find((x) => typeof x?.message === 'string')?.message;
        if (msg) return String(msg);
    }
    return null;
};

/**
 * Cart-related hacks and utilities.
 * This hook handles `/?discount={code}` parameters and cart creation timeouts.
 *
 * @param options - The options.
 * @param options.locale - The locale.
 * @returns } potential errors.
 */
export const useCartUtils = ({
    locale,
}: {
    locale: Locale;
}): {
    error: Error | undefined;
    cartError: unknown | undefined;
} => {
    const router = useRouter();
    const pathname = usePathname();
    const query = useSearchParams();

    const {
        status,
        buyerIdentity,
        buyerIdentityUpdate,
        discountCodes,
        discountCodesUpdate,
        cartReady,
        error: cartError,
    } = useCart();

    // Stable refs to mutable values that should not retrigger effects. Refs are
    // populated via an effect to avoid touching ref.current during render.
    const buyerIdentityUpdateRef = useRef(buyerIdentityUpdate);
    const discountCodesUpdateRef = useRef(discountCodesUpdate);
    const routerRef = useRef(router);
    const discountCodesRef = useRef(discountCodes);
    // Track the last-seen error reference so we only toast once per failure
    // — Hydrogen-React sets `cart.error` synchronously and we don't want to
    // spam the toaster on every re-render that follows.
    const lastSeenErrorRef = useRef<unknown>(undefined);

    useEffect(() => {
        buyerIdentityUpdateRef.current = buyerIdentityUpdate;
        discountCodesUpdateRef.current = discountCodesUpdate;
        routerRef.current = router;
        discountCodesRef.current = discountCodes;
    });

    // Surface Shopify cart errors. Without this, `linesAdd`/`linesUpdate`/
    // `discountCodesUpdate` failures (sold-out variant, quantity cap exceeded,
    // throttled, invalid discount) silently update `cart.error` while the
    // optimistic UI shows success — and the user sails into checkout with a
    // cart that doesn't reflect what they thought they had.
    useEffect(() => {
        if (cartError == null || cartError === lastSeenErrorRef.current) return;
        lastSeenErrorRef.current = cartError;
        const msg = formatCartError(cartError);
        console.error('[cart] error from Shopify storefront API:', cartError);
        toast.error(msg ?? 'Something went wrong updating your cart.');
    }, [cartError]);

    // Handle country code change
    useEffect(() => {
        if (!cartReady || buyerIdentity?.countryCode === locale.country) {
            return;
        }

        buyerIdentityUpdateRef.current({
            countryCode: locale.country,
        });
    }, [locale.country, buyerIdentity, cartReady]);

    // Discount codes in url
    useEffect(() => {
        if (status !== 'idle' || !query.has('discount')) {
            return;
        }

        const discounts: string[] = query.getAll('discount').map((value) => (value.toString() as string).toLowerCase());
        if (discounts.length <= 0) {
            return;
        }

        // TODO: Check cart errors and validate that the code was actually valid.
        //discounts.every((discount) => validateDiscountCode(discount))

        const active = [
            ...(discountCodesRef.current
                ?.map((discount) => discount?.code?.toLowerCase())
                .filter((i): i is string => !!i) || []),
        ];
        if (discounts.every((discount) => active.includes(discount))) {
            return;
        }

        discountCodesUpdateRef.current([...active, ...discounts]);
        const params = new URLSearchParams(query);
        params.delete('discount');
        routerRef.current.replace(`${pathname}${params.size > 0 ? '?' : ''}${params.toString()}`, { scroll: false });
    }, [status, query, pathname]);

    // Remove codes that are no longer applicable.
    useEffect(() => {
        if (!cartReady || (discountCodes || []).length <= 0) {
            return;
        }

        const discounts = (discountCodes || []).filter((_) => typeof _ !== 'undefined');
        if (discounts.length <= 0) {
            return;
        }

        const applicable = discounts.filter(({ applicable }) => applicable === true);
        if (applicable.length === discounts.length) {
            return;
        }

        discountCodesUpdateRef.current(applicable.map(({ code }) => code!));
    }, [discountCodes, cartReady]);

    return { error: undefined, cartError };
};
