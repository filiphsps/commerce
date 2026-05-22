import 'server-only';

import { Gift as GiftIcon, Package as PackageIcon, RefreshCw as SubscriptionIcon } from 'lucide-react';
import { isProductVegan, type Product } from '@/api/product';
import { COMMON_BADGE_STYLES } from '@/components/product-card/primitives/badge-styles';
import { AttributeIcon } from '@/components/products/attribute-icon';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import type { LocaleDictionary } from '@/utils/locale';
import { capitalize, getTranslations } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';

export type ProductCardBadgesProps = {
    data: Product;
    i18n: LocaleDictionary;
};

const ProductCardBadges = ({ data: product, i18n }: ProductCardBadgesProps) => {
    const selectedVariant = firstAvailableVariant(product);
    const { t } = getTranslations('product', i18n);

    if (!selectedVariant) {
        return null;
    }

    const isFreeShipping = product.tags.includes('Free Shipping');
    if (isFreeShipping) {
        return (
            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap justify-start">
                <div
                    className={cn(
                        COMMON_BADGE_STYLES,
                        'h-8 rounded-t-(--product-card-image-radius) rounded-b-none bg-primary px-3 text-primary-foreground text-xs normal-case leading-none',
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
    const isGiftCard = product.isGiftCard === true;
    const isSubscription = product.requiresSellingPlan === true;

    let discount = 0;
    if (isSale) {
        const compare = safeParseFloat(0, selectedVariant.compareAtPrice?.amount);
        const current = safeParseFloat(0, selectedVariant.price.amount);
        discount = Math.round((100 * (compare - current)) / compare);
    }

    return (
        <div
            className={cn(
                'pointer-events-none absolute inset-2 bottom-auto flex flex-wrap justify-start gap-1 empty:hidden',
            )}
        >
            {isVegan && (
                <div className={cn(COMMON_BADGE_STYLES, 'bg-green-600 stroke-white text-white')}>
                    <AttributeIcon data={'vegan'} className="h-4" />
                    {capitalize(t('vegan'))}
                </div>
            )}

            {isGiftCard ? (
                <div className={cn(COMMON_BADGE_STYLES, 'bg-purple-600 stroke-white text-white')}>
                    <GiftIcon className="h-3 w-3 stroke-2" />
                    {capitalize(t('gift-card'))}
                </div>
            ) : null}

            {isSubscription ? (
                <div className={cn(COMMON_BADGE_STYLES, 'bg-blue-600 stroke-white text-white')}>
                    <SubscriptionIcon className="h-3 w-3 stroke-2" />
                    {capitalize(t('subscription'))}
                </div>
            ) : null}

            {discount > 1 ? (
                <div className={cn(COMMON_BADGE_STYLES, 'bg-sale-stripes font-bold text-white')} data-nosnippet={true}>
                    {capitalize(t('percentage-off', discount))}
                </div>
            ) : null}
        </div>
    );
};

ProductCardBadges.displayName = 'Nordcom.ProductCard.Badges';
export default ProductCardBadges;
