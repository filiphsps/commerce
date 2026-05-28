import { Button } from '@/components/actionable/button';
import Link from '@/components/link';
import { Label } from '@/components/typography/label';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';

/** Props for the {@link CartEmpty} component. */
export type CartEmptyProps = {
    i18n: LocaleDictionary;
};

/**
 * Empty-cart placeholder shown when the cart holds no line items. Pairs a
 * localized message with a continue-shopping link back to the storefront home,
 * giving the shopper an obvious next step instead of a dead-end disabled
 * checkout summary.
 *
 * @param props.i18n - Locale dictionary used to translate the empty-state copy.
 * @returns The empty-cart message and continue-shopping call to action.
 */
export const CartEmpty = ({ i18n }: CartEmptyProps) => {
    const { t } = getTranslations('cart', i18n);

    return (
        <section className="flex w-full flex-col items-start gap-4 py-4" data-testid="cart-empty">
            <Label className="text-base text-gray-600 normal-case">{t('empty')}</Label>

            <Button as={Link} href="/">
                {t('continue-shopping')}
            </Button>
        </section>
    );
};

CartEmpty.displayName = 'Nordcom.Cart.Empty';
