import { useEffect, useState } from 'react';

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
 * @returns {{ error: Error | undefined; cartError: any | undefined; }} potential errors.
 */
export const useCartUtils = ({
    locale
}: {
    locale: Locale;
}): {
    error: Error | undefined;
    cartError: any | undefined;
} => {
    const [error, setError] = useState<Error | undefined>();
    const [createTimeout, setCreateTimeout] = useState<ReturnType<typeof setInterval> | undefined>();
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
        cartCreate
    } = useCart();

    // Handle uninitialized carts and cart creation timeout.
    useEffect(() => {
        const onTimeout = () => {
            if (['interactive', 'complete'].includes(document.readyState)) {
                setCreateTimeout(() => {
                    clearInterval(createTimeout);
                    return setTimeout(onTimeout, 5000);
                });
                return;
            }

            if (status !== 'uninitialized') {
                return;
            }

            console.warn('Cart failed to initialize or does not exist, creating a new cart...');
            cartCreate({
                buyerIdentity: {
                    countryCode: locale.country
                }
            });
        };

        setCreateTimeout(setTimeout(onTimeout, 5000));

        return () =>
            setCreateTimeout(() => {
                clearInterval(createTimeout);
                return undefined;
            });
    }, [status]);

    // Handle country code change
    useEffect(() => {
        if (!cartReady || buyerIdentity?.countryCode === locale.country) {
            return;
        }

        buyerIdentityUpdate({
            countryCode: locale.country
        });
    }, [locale.code, buyerIdentity, cartReady]);

    // Discount codes in url
    useEffect(() => {
        if (status !== 'idle' || !query.has('discount')) {
            return;
        }

        const discounts: string[] = ((query.getAll('discount') as any) || []).map((value: any) =>
            (value.toString() as string).toLowerCase()
        );
        if (discounts.length <= 0) {
            return;
        }

        // TODO: Check cart errors and validate that the code was actually valid.
        //discounts.every((discount) => validateDiscountCode(discount))

        const active = [...(discountCodes?.map((discount) => discount?.code?.toLowerCase()!).filter(Boolean) || [])];
        if (discounts.every((discount) => active.includes(discount))) {
            return;
        }

        discountCodesUpdate([...active, ...discounts]);
        const params = new URLSearchParams(query);
        params.delete('discount');
        router.replace(`${pathname}${params.size > 0 ? '?' : ''}${params.toString()}`, { scroll: false });

        if (cartError && error != cartError) {
            setError(() => error);
        }
    }, [status, query, pathname]);

    // Remove codes that are no longer applicable.
    useEffect(() => {
        if (!cartReady || (discountCodes || []).length <= 0) {
            return;
        }

        const discounts = (discountCodes || [])!.filter((_) => typeof _ !== 'undefined');
        if (discounts.length <= 0) {
            return;
        }

        const applicable = discounts.filter(({ applicable }) => applicable === true);
        if (applicable.length === discounts.length) {
            return;
        }

        discountCodesUpdate(applicable.map(({ code }) => code!));
    }, [discountCodes, cartReady]);

    return { error, cartError };
};
