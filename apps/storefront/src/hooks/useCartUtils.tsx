import { useEffect, useRef } from 'react';

import type { Error } from '@nordcom/commerce-errors';

import { useCart } from '@shopify/hydrogen-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { Locale } from '@/utils/locale';

/**
 * Cart-related hacks and utilities.
 * This hook handles `/?discount={code}` parameters and cart creation timeouts.
 *
 * @param {object} options - The options.
 * @param {Locale} options.locale - The locale.
 * @returns {{ error: Error | undefined; cartError: unknown | undefined; }} potential errors.
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

    useEffect(() => {
        buyerIdentityUpdateRef.current = buyerIdentityUpdate;
        discountCodesUpdateRef.current = discountCodesUpdate;
        routerRef.current = router;
        discountCodesRef.current = discountCodes;
    });

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
