import { Locale } from '../util/Locale';
import { useCart } from '@shopify/hydrogen-react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

interface useCartUtilsProps {
    locale: Locale;
}
export function useCartUtils({ locale }: useCartUtilsProps) {
    const { query } = useRouter();
    const { buyerIdentity, buyerIdentityUpdate, discountCodes, discountCodesUpdate } = useCart();

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
        if (!query || !query.discount) return;
        const discount = query.discount.toString();

        // TODO: Notification?
        if (discountCodes?.length && discountCodes?.find?.((i) => i?.code == discount)) return;
        discountCodesUpdate([...(discountCodes || ([] as any)), discount]);
    }, [query]);
}
