/* eslint-disable react-hooks/rules-of-hooks */

import { useEffect, useState } from 'react';

import type { Error } from '@nordcom/commerce-errors';

import { useCart } from '@shopify/hydrogen-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { Locale } from '@/utils/locale';

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
        discountCodes = [],
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
        if (!cartReady || !query.has('discount')) {
            return;
        }

        const discounts: string[] = ((query.getAll('discount') as any) || []).map((value: any) => value.toString());
        if (discounts.length <= 0) {
            return;
        }

        // TODO: Check cart errors and validate that the code was actually valid.
        //discounts.every((discount) => validateDiscountCode(discount))

        const codes = [...(discountCodes.map((discount) => discount?.code).filter(Boolean) as string[]), ...discounts];
        discountCodesUpdate(codes);

        // Only update the URL if the discount codes actually were applied.
        const params = new URLSearchParams(query);
        params.delete('discount');
        router.replace(`${pathname}${params.size > 0 ? '?' : ''}${params.toString()}`, { scroll: false });

        if (cartError && error != cartError) {
            setError(() => error);
        }
    }, [query, cartReady]);

    return { error, cartError };
};
