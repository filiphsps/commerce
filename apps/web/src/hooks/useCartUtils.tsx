import type { Locale } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';
import { useEffect } from 'react';

interface useCartUtilsProps {
    locale: Locale;
}
export function useCartUtils({ locale }: useCartUtilsProps) {
    const query = {} as any; //useSearchParams() as any;
    const { buyerIdentity, buyerIdentityUpdate, discountCodes, discountCodesUpdate, status, error } = useCart();

    // Handle country code change
    useEffect(() => {
        if (!buyerIdentity || locale.country === buyerIdentity?.countryCode) return;

        buyerIdentityUpdate({
            ...(buyerIdentity as any),
            countryCode: locale.country
        });
    }, [locale.locale]);

    // Discount codes in url
    useEffect(() => {
        // TODO: Create a cart if one doesn't exist
        if (!query || (!query.discount && status !== 'idle')) return;
        const discount = query.discount?.toString();
        if (!discount) return;

        delete query.discount;
        /*router.replace(
            {
                pathname: route!,
                query: query
            },
            undefined,
            //{ shallow: true }
        );*/

        // TODO: Notification?
        discountCodesUpdate([...(discountCodes || ([] as any)), discount]);

        if (error) console.warn(error);

        // TODO: Check cart errors and validate that the code was actually valid...
    }, [query, status]);
}
