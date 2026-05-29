import { ShoppingBag as EmptyCartIcon } from 'lucide-react';

import { Button } from '@/components/actionable/button';
import { EmptyState } from '@/components/empty-state';
import Link from '@/components/link';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';

/** Props for the {@link CartEmpty} component. */
export type CartEmptyProps = {
    i18n: LocaleDictionary;
};

/**
 * Empty-cart placeholder shown when the cart holds no line items. Renders the
 * shared {@link EmptyState} primitive so the visuals stay tenant-themeable via
 * the semantic tokens, pairing a localized message with a continue-shopping
 * link back to the storefront home — an obvious next step instead of a
 * dead-end disabled checkout summary.
 *
 * @param props.i18n - Locale dictionary used to translate the empty-state copy.
 * @returns The empty-cart message and continue-shopping call to action.
 */
export const CartEmpty = ({ i18n }: CartEmptyProps) => {
    const { t } = getTranslations('cart', i18n);

    return (
        <EmptyState
            data-testid="cart-empty"
            icon={<EmptyCartIcon aria-hidden="true" />}
            title={t('empty-title')}
            description={t('empty')}
            action={
                <Button as={Link} href="/">
                    {t('continue-shopping')}
                </Button>
            }
        />
    );
};

CartEmpty.displayName = 'Nordcom.Cart.Empty';
