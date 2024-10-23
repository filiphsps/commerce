import { isProductVegan, type Product } from '@/api/product';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { capitalize, getTranslations } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { Package as PackageIcon } from 'lucide-react';

import { AttributeIcon } from '@/components/products/attribute-icon';

import type { LocaleDictionary } from '@/utils/locale';

export type ProductCardBadgesProps = {
    data: Product;
    i18n: LocaleDictionary;
};

export const COMMON_BADGE_STYLES =
    'z-10 flex h-7 items-center justify-center gap-1 rounded-full px-[0.7rem] text-[0.65rem] font-semibold uppercase shadow';

const ProductCardBadges = ({ data: product, i18n }: ProductCardBadgesProps) => {
    const selectedVariant = firstAvailableVariant(product);
    const { t } = getTranslations('product', i18n);

    if (!selectedVariant) {
        return null;
    }

    const isFreeShipping = product.tags.includes('Free Shipping');
    if (isFreeShipping) {
        return (
            <div className="pointer-events-none absolute inset-0 flex h-full flex-wrap justify-start">
                <div
                    className={cn(
                        COMMON_BADGE_STYLES,
                        'bg-primary text-primary-foreground -mt-1 h-8 rounded-l-none rounded-t-none text-xs normal-case leading-none'
                    )}
                >
                    <PackageIcon className="text-sm leading-none" />
                    {capitalize(t('free-shipping'))}
                </div>
            </div>
        );
    }

    const isVegan = isProductVegan(product);
    const isSale = typeof selectedVariant.compareAtPrice?.amount !== 'undefined';

    let discount = 0;
    if (isSale) {
        const compare = safeParseFloat(0, selectedVariant.compareAtPrice?.amount);
        const current = safeParseFloat(0, selectedVariant.price.amount);
        discount = Math.round((100 * (compare - current)) / compare);
    }

    return (
        <>
            <div
                className={cn(
                    'pointer-events-none absolute inset-1 bottom-auto flex flex-wrap justify-start gap-1 empty:hidden'
                )}
            >
                {isVegan && (
                    <div className={cn(COMMON_BADGE_STYLES, 'bg-green-600 stroke-white text-white')}>
                        <AttributeIcon data={'vegan'} className="h-4" />
                        {capitalize(t('vegan'))}
                    </div>
                )}

                {discount > 1 ? ( // Handle rounding-errors.
                    <div
                        className={cn(COMMON_BADGE_STYLES, 'bg-sale-stripes font-bold text-white')}
                        data-nosnippet={true}
                    >
                        {capitalize(t('percentage-off', discount))}
                    </div>
                ) : null}
            </div>
        </>
    );
};

ProductCardBadges.displayName = 'Nordcom.ProductCard.Badges';
export default ProductCardBadges;
