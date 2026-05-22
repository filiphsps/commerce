import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Fragment, Suspense } from 'react';
import type { Product } from '@/api/product';
import { type ProductCardVariant, resolveVariant } from '@/components/product-card/context';
import ProductCardBadges from '@/components/product-card/primitives/product-card-badges';
import ProductCardRoot from '@/components/product-card/primitives/product-card-root';
import ProductCardTitle from '@/components/product-card/primitives/product-card-title';
import HorizontalBare from '@/components/product-card/variants/horizontal-bare';
import HorizontalBoxed from '@/components/product-card/variants/horizontal-boxed';
import Micro from '@/components/product-card/variants/micro';
import VerticalBare from '@/components/product-card/variants/vertical-bare';
import VerticalBoxed from '@/components/product-card/variants/vertical-boxed';
import { getDictionary } from '@/utils/dictionary';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import type { Locale } from '@/utils/locale';

const VARIANT_COMPONENTS = {
    'vertical-boxed': VerticalBoxed,
    'vertical-bare': VerticalBare,
    'horizontal-boxed': HorizontalBoxed,
    'horizontal-bare': HorizontalBare,
    micro: Micro,
} as const;

export type ProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data?: Product;
    variant?: ProductCardVariant | string;
    priority?: boolean;
    className?: string;
};

const ProductCard = async ({ shop, locale, data: product, variant, priority = false, className }: ProductCardProps) => {
    if (!product) {
        return null;
    }

    const i18n = await getDictionary({ shop, locale });
    const resolved = resolveVariant(variant);
    const VariantComponent = VARIANT_COMPONENTS[resolved];
    const initialVariant = firstAvailableVariant(product);

    const title = <ProductCardTitle shop={shop} data={product} />;
    const badges = <ProductCardBadges data={product} i18n={i18n} />;

    return (
        <Suspense key={`product-card.${product.handle}`} fallback={<Fragment />}>
            <ProductCardRoot
                data={product}
                variant={resolved}
                i18n={i18n}
                locale={locale}
                initialVariant={initialVariant}
                priority={priority}
                className={className}
            >
                <VariantComponent title={title} badges={badges} />
            </ProductCardRoot>
        </Suspense>
    );
};

ProductCard.displayName = 'Nordcom.ProductCard';

ProductCard.skeleton = ({ variant }: { variant?: ProductCardVariant } = {}) => {
    const resolved = resolveVariant(variant);
    return (
        <div
            data-skeleton
            data-variant={resolved}
            className="border-(length:--product-card-border-width) border-(color:var(--product-card-border-color)) relative flex min-h-[18rem] w-full snap-center snap-always overflow-hidden rounded-(--product-card-radius) border-solid bg-(--product-card-bg) p-(--product-card-padding)"
        />
    );
};

(ProductCard.skeleton as unknown as { displayName: string }).displayName = 'Nordcom.ProductCard.Skeleton';

export default ProductCard;
