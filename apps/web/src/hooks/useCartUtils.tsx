/* eslint-disable react-hooks/rules-of-hooks */

import { useCart } from '@shopify/hydrogen-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { Locale } from '@/utils/locale';
import type { Error } from '@nordcom/commerce-errors';

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
    if (typeof window === 'undefined') {
        return { error: undefined, cartError: undefined };
    }

    const [error, setError] = useState<Error | undefined>();
    const query = useSearchParams() as any;

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
        if (status !== 'idle' || !locale || buyerIdentity?.countryCode === locale.country) return;

        buyerIdentityUpdate({
            countryCode: locale.country
        });
    }, [locale.code, buyerIdentity]);

    // Discount codes in url
    useEffect(() => {
        if (!locale || status !== 'idle') return;

        const discount = query?.discount?.toString();
        if (!discount) return;

        delete query.discount;

        // Notification?
        // TODO: Implement notification here

        // Check cart errors and validate that the code was actually valid.
        if (validateDiscountCode(discount)) {
            discountCodesUpdate([...(discountCodes || []), discount]);
        }

        if (cartError && error != cartError) {
            setError(() => error);
        }
    }, [query, status]);

    return { error, cartError };
};
