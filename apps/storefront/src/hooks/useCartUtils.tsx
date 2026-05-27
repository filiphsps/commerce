import { useCartActions, useCartMeta, useCartStatus } from '@nordcom/cart-react';
import type { Error } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { AppCartCaps } from '@/cart/caps';
import type { Locale } from '@/utils/locale';

/**
 * Cart-related URL hooks.
 *
 * Handles `/?discount={code}` URL params — applies each code through the
 * NordcomCart provider and cleans the URL once Shopify echoes the code back.
 *
 * Locale-driven buyer-identity sync is no longer the responsibility of this
 * hook: the NordcomCart provider rebuilds the cart against the active shop
 * + locale at the server-action layer, so syncing in the client would be a
 * race.
 *
 * @param options - The options.
 * @param options.locale - The locale (kept on the signature so callers don't
 *   need to refactor; currently unused).
 * @returns Any latent errors.
 */
export const useCartUtils = (_options: {
    locale: Locale;
}): {
    error: Error | undefined;
    cartError: string | null;
} => {
    const router = useRouter();
    const pathname = usePathname();
    const query = useSearchParams();

    const { applyDiscountCode } = useCartActions<AppCartCaps>();
    const { status, cartReady, error: cartError } = useCartStatus();
    const { discountCodes } = useCartMeta();

    // Stable refs to mutable values that should not retrigger effects.
    const applyDiscountCodeRef = useRef(applyDiscountCode);
    const routerRef = useRef(router);
    const discountCodesRef = useRef(discountCodes);
    // Track the last-seen error string so we only toast once per failure —
    // the provider sets `error` synchronously and we don't want to spam the
    // toaster on every re-render that follows.
    const lastSeenErrorRef = useRef<string | null>(null);
    // Track the sorted key of the last discount set we submitted so that a
    // Shopify rejection (which leaves discountCodes empty) does not cause the
    // effect to re-fire on every subsequent idle render — an infinite API loop.
    const lastSubmittedDiscountKeyRef = useRef<string | null>(null);

    useEffect(() => {
        applyDiscountCodeRef.current = applyDiscountCode;
        routerRef.current = router;
        discountCodesRef.current = discountCodes;
    });

    // Surface cart errors via toast — the provider stores the last failure
    // message; we only need to flash it once per change.
    useEffect(() => {
        if (cartError == null || cartError === lastSeenErrorRef.current) return;
        lastSeenErrorRef.current = cartError;
        trace.getActiveSpan()?.addEvent('cart.storefront_api_error', {
            'error.message': cartError,
        });
        toast.error(cartError);
    }, [cartError]);

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

        if (!cartReady || status !== 'idle') return;

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

            // Apply each requested code; the provider already toasts on
            // failure via the shared error surface above.
            const toApply = requested.filter((code) => !active.includes(code));
            for (const code of toApply) {
                void applyDiscountCodeRef.current(code);
            }
            return;
        }

        // All requested codes are now active. Safe to clean the URL.
        const params = new URLSearchParams(query.toString());
        params.delete('discount');
        routerRef.current.replace(`${pathname}${params.size > 0 ? '?' : ''}${params.toString()}`, { scroll: false });
    }, [status, query, pathname, cartReady]);

    return { error: undefined, cartError };
};
