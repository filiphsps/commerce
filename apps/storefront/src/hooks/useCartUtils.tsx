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
    // Track the sorted key of the last discount set we submitted so that a
    // Shopify rejection (which leaves discountCodes empty) does not cause the
    // effect to re-fire on every subsequent idle render — an infinite API loop.
    const lastSubmittedDiscountKeyRef = useRef<string | null>(null);

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

    // Discount codes in url. We update the cart immediately, but only clean the
    // URL once the cart has settled and the new code(s) are actually applied.
    // This prevents a "ghost discount" UX where Shopify rejects the code and
    // the URL no longer carries the request — leaving the user with a quietly
    // failed apply.
    useEffect(() => {
        // When the discount param disappears, clear the submission key so a
        // future re-entry (e.g. user pastes a new ?discount= link) can submit.
        if (!query.has('discount')) {
            lastSubmittedDiscountKeyRef.current = null;
            return;
        }

        if (status !== 'idle') return;

        const requested = query
            .getAll('discount')
            .map((v) => v.toString().toLowerCase())
            .filter((v) => v.length > 0);
        if (requested.length === 0) return;

        const active = (discountCodesRef.current ?? [])
            .map((d) => d?.code?.toLowerCase())
            .filter((c): c is string => !!c);

        const allActive = requested.every((code) => active.includes(code));

        if (!allActive) {
            // Deduplicate to avoid re-submitting the same rejected set on every
            // idle render — Shopify leaves discountCodes empty on rejection, which
            // would otherwise cause an infinite API call loop.
            const requestedKey = [...requested].sort().join(',');
            if (lastSubmittedDiscountKeyRef.current === requestedKey) return;
            lastSubmittedDiscountKeyRef.current = requestedKey;

            // Fire the update; do NOT touch the URL — let the next render decide.
            discountCodesUpdateRef.current(Array.from(new Set([...active, ...requested])));
            return;
        }

        // All requested codes are now active. Safe to clean the URL.
        const params = new URLSearchParams(query.toString());
        params.delete('discount');
        routerRef.current.replace(`${pathname}${params.size > 0 ? '?' : ''}${params.toString()}`, { scroll: false });
    }, [status, query, pathname, discountCodes]);

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
