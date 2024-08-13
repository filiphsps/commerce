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

    if (!selectedVariant) return null;

    const isNewProduct =
        product.createdAt &&
        Math.abs(new Date(product.createdAt).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000) < 15; // TODO: Do this properly through a tag or similar.
    const isVegan = isProductVegan(product);
    const isSale = !!selectedVariant.compareAtPrice?.amount;

    let discount = 0;
    if (isSale && selectedVariant) {
        const compare = Number.parseFloat(selectedVariant.compareAtPrice!.amount!);
        const current = Number.parseFloat(selectedVariant.price!.amount!);
        discount = Math.round((100 * (compare - current)) / compare);
    }
    const shouldShowBadge = isNewProduct || isVegan;

    return (
        <>
            <div className={cn('absolute inset-1 bottom-auto flex flex-wrap justify-between gap-1 empty:hidden')}>
                {discount > 1 ? ( // Handle rounding-errors.
                    <div className={cn(COMMON_BADGE_STYLES, 'bg-sale-stripes text-white')} data-nosnippet={true}>
                        {t('percentage-off', discount)}
                    </div>
                ) : null}

                {shouldShowBadge ? (
                    <>
                        {isVegan && (
                            <div className={cn(COMMON_BADGE_STYLES, 'bg-green-500 text-white')}>
                                <AttributeIcon data={'vegan'} className="text-lg" />
                                {t('vegan')}
                            </div>
                        )}

                        {isNewProduct && (
                            <div className={cn(COMMON_BADGE_STYLES, 'bg-gray-100 text-gray-700')} data-nosnippet={true}>
                                {t('new')}
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </>
    );
};

ProductCardBadges.displayName = 'Nordcom.ProductCard.Badges';
export default ProductCardBadges;
