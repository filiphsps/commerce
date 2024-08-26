/* eslint-disable react-hooks/rules-of-hooks */

import { useEffect, useState } from 'react';

import type { Error } from '@nordcom/commerce-errors';

import { useCart } from '@shopify/hydrogen-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { Locale } from '@/utils/locale';
import type { CartDiscountCode } from '@shopify/hydrogen-react/storefront-api-types';

// TODO: Implement discount code validation.
const validateDiscountCode = (_code: string) => {
    return true;
};

type useCartUtilsProps = {
    locale: Locale;
};
type useCartUtilsResult = {
    error: Error | undefined;
    cartError: any | undefined;
};
export const useCartUtils = ({ locale }: useCartUtilsProps): useCartUtilsResult => {
    const [error, setError] = useState<Error | undefined>();
    const router = useRouter();
    const pathname = usePathname();
    const query = useSearchParams();

    const {
        buyerIdentity,
        buyerIdentityUpdate,
        discountCodes,
        discountCodesUpdate,
        cartReady,
        error: cartError
    } = useCart();

    // Handle country code change
    useEffect(() => {
        if (!cartReady || buyerIdentity?.countryCode === locale.country) {
            return;
        }

        buyerIdentityUpdate({
            countryCode: locale.country
        });
    }, [locale.code, buyerIdentity]);

    // Discount codes in url
    useEffect(() => {
        if (!cartReady) {
            return;
        }

        let discounts: string[] | null = (query as any)?.get?.('discount') || null;
        if (discounts !== null) {
            if (typeof discounts === 'string') {
                discounts = (discounts as string).split(',');
            } else if (Array.isArray(discounts)) {
                discounts = discounts.map((value) => value.toString());
            }
        }

        if (discounts === null || discounts.length <= 0) {
            return;
        }

        const params = new URLSearchParams(query);
        params.delete('discount');
        router.replace(`${pathname}${params.size > 0 ? '?' : ''}${params.toString()}`, { scroll: false });

        // Check cart errors and validate that the code was actually valid.
        if (discounts.every((discount) => validateDiscountCode(discount))) {
            discountCodesUpdate([
                ...((discountCodes || []) as CartDiscountCode[]).map((discount) => discount.code).filter(Boolean),
                ...discounts
            ]);
        }

        if (cartError && error != cartError) {
            setError(() => error);
        }
    }, [query, cartReady]);

    return { error, cartError };
};
