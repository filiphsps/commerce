import type { Locale } from '@/utils/Locale';
import { useCart } from '@shopify/hydrogen-react';
import { useEffect } from 'react';

interface useCartUtilsProps {
    locale: Locale;
}
export function useCartUtils({ locale }: useCartUtilsProps) {
    const { buyerIdentity, buyerIdentityUpdate, status, error, cartCreate } = useCart();

    // Create a cart
    useEffect(() => {
        if (status !== 'uninitialized') return;

        cartCreate({
            lines: [],
            buyerIdentity: {
                countryCode: locale.country
            }
        });
    }, [status]);

    // Handle country code change.
    useEffect(() => {
        if ((!buyerIdentity || locale.country === buyerIdentity?.countryCode) && status !== 'idle') return;

        buyerIdentityUpdate({
            ...(buyerIdentity as any),
            countryCode: locale.country
        });
    }, [locale.locale]);

    // Handle errors.
    useEffect(() => {
        if (!error) return;

        console.error('cart error:', error);
    }, [error]);

    // Discount codes in url.
    /*useEffect(() => {
        // TODO: Create a cart if one doesn't exist
        if (!router.query || (!router.query.discount && status !== 'idle')) return;
        const discount = router.query.discount?.toString();
        if (!discount) return;

        delete router.query.discount;
        router.replace(
            {
                pathname: router.pathname!,
                query: router.query
            },
            undefined,
            { shallow: true }
        );

        // TODO: Notification?
        discountCodesUpdate([...(discountCodes || ([] as any)), discount]);

        if (error) console.warn(error);

        // TODO: Check cart errors and validate that the code was actually valid...
    }, [router.query, status]);*/
}
