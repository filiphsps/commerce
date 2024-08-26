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
    const discount = query.get('discount')?.toString() || null;

    const {
        buyerIdentity,
        buyerIdentityUpdate,
        discountCodes,
        discountCodesUpdate,
        status,
        error: cartError
    } = useCart();

    // Handle country code change
    useEffect(() => {
        if (status !== 'idle' || buyerIdentity?.countryCode === locale.country) {
            return;
        }

        buyerIdentityUpdate({
            countryCode: locale.country
        });
    }, [locale.code, buyerIdentity]);

    // Discount codes in url
    useEffect(() => {
        if (status !== 'idle' || discount === null || discount.length <= 0) {
            return;
        }

        const params = new URLSearchParams(query);
        params.delete('discount');
        router.replace(`${pathname}${params.size > 0 ? '?' : ''}${params.toString()}`, { scroll: false });

        // Check cart errors and validate that the code was actually valid.
        if (validateDiscountCode(discount)) {
            let codes = ((discountCodes || []) as CartDiscountCode[]).map(({ code }) => code);
            if (!codes.some((code) => code === discount)) {
                codes.push(discount);
            }

            discountCodesUpdate(codes);
        }

        if (cartError && error != cartError) {
            setError(() => error);
        }
    }, [query, status]);

    return { error, cartError };
};
