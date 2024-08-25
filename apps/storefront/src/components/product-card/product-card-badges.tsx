import { isProductVegan, type Product } from '@/api/product';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import { useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

import { AttributeIcon } from '../products/attribute-icon';

import type { LocaleDictionary } from '@/utils/locale';

export type ProductCardBadgesProps = {
    data: Product;
    i18n: LocaleDictionary;
};

const COMMON_BADGE_STYLES =
    'flex  gap-1 rounded-2xl p-[0.4rem] px-2 text-xs font-semibold shadow-sm items-center justify-center uppercase z-10';

const ProductCardBadges = ({ data: product, i18n }: ProductCardBadgesProps) => {
    const selectedVariant = FirstAvailableVariant(product);
    const { t } = useTranslation('product', i18n);

    if (!selectedVariant) {
        return null;
    }

    const isVegan = isProductVegan(product);
    const isSale = typeof selectedVariant.compareAtPrice?.amount !== 'undefined';

    let discount = 0;
    if (isSale) {
        const compare = Number.parseFloat(selectedVariant.compareAtPrice!.amount!);
        const current = Number.parseFloat(selectedVariant.price!.amount!);
        discount = Math.round((100 * (compare - current)) / compare);
    }

    return (
        <>
            <div className={cn('absolute inset-1 bottom-auto flex flex-wrap justify-between gap-1 empty:hidden')}>
                {discount > 1 ? ( // Handle rounding-errors.
                    <div className={cn(COMMON_BADGE_STYLES, 'bg-sale-stripes text-white')} data-nosnippet={true}>
                        {t('percentage-off', discount)}
                    </div>
                ) : null}

                {isVegan && (
                    <div className={cn(COMMON_BADGE_STYLES, 'bg-green-500 text-white')}>
                        <AttributeIcon data={'vegan'} className="text-lg" />
                        {t('vegan')}
                    </div>
                )}
            </div>
        </>
    );
};

ProductCardBadges.displayName = 'Nordcom.ProductCard.Badges';
export default ProductCardBadges;
