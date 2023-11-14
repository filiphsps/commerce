import type { CommerceError } from '@/utils/errors';
import type { Locale } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// TODO: Implement discount code validation.
const validateDiscountCode = (_code: string) => {
    return true;
};

type useCartUtilsProps = {
    locale: Locale;
};
type useCartUtilsResult = {
    error: CommerceError | undefined;
};
export const useCartUtils = ({ locale }: useCartUtilsProps): useCartUtilsResult => {
    const [error, setError] = useState<CommerceError | undefined>();
    const query = useSearchParams() as any;

    const {
        buyerIdentity,
        buyerIdentityUpdate,
        discountCodes,
        discountCodesUpdate,
        status,
        error: cartError,
        cartCreate
    } = useCart();

    // Handle country code change
    useEffect(() => {
        if (!buyerIdentity || locale.country === buyerIdentity?.countryCode) return;

        buyerIdentityUpdate({
            ...(buyerIdentity as any),
            countryCode: locale.country
        });
    }, [locale.locale, buyerIdentity]);

    // Discount codes in url
    useEffect(() => {
        // Create a cart if one doesn't exist.
        if (locale && status === 'uninitialized') {
            cartCreate({
                buyerIdentity: {
                    countryCode: locale.country
                    // TODO: `email`, `phone` etc when accounts are implemented.
                }
            });
        }

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

    return { error };
};
