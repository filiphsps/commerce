import { Locale } from '../util/Locale';
import { useCart } from '@shopify/hydrogen-react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

interface useCartUtilsProps {
    locale: Locale;
}
export function useCartUtils({ locale }: useCartUtilsProps) {
    const router = useRouter();
    const {
        buyerIdentity,
        buyerIdentityUpdate,
        discountCodes,
        discountCodesUpdate,
        status,
        error
    } = useCart();

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

        if (error) console.error(error);

        // TODO: Check cart errors and validate that the code was actually valid...
    }, [router.query, status]);
}
