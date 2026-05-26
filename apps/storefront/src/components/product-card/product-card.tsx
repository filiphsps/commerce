import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { ReactNode } from 'react';
import { Fragment, Suspense } from 'react';
import type { Product } from '@/api/product';
import ProductCardRoot from '@/components/product-card/primitives/product-card-root';
import type { Locale } from '@/utils/locale';

export type ProductCardLayout = 'vertical' | 'horizontal' | 'micro';
export type ProductCardChrome = 'boxed' | 'bare';

const resolveVariant = (layout: ProductCardLayout, chrome: ProductCardChrome): string =>
    layout === 'micro' ? 'micro' : `${layout}-${chrome}`;

export type ProductCardProps = {
    shop: OnlineShop;
    locale: Locale;
    data?: Product;
    layout?: ProductCardLayout;
    chrome?: ProductCardChrome;
    priority?: boolean;
    className?: string;
    children: ReactNode;
};

const ProductCard = ({
    data: product,
    layout = 'vertical',
    chrome = 'boxed',
    className,
    children,
}: ProductCardProps) => {
    if (!product?.variants?.edges?.[0]?.node) {
        return null;
    }

    const variant = resolveVariant(layout, chrome);

    return (
        <Suspense key={`product-card.${product.handle}`} fallback={<Fragment />}>
            <ProductCardRoot data={product} variant={variant} className={className}>
                {children}
            </ProductCardRoot>
        </Suspense>
    );
};

ProductCard.displayName = 'Nordcom.ProductCard';

ProductCard.skeleton = ({
    layout = 'vertical' as ProductCardLayout,
    chrome = 'boxed' as ProductCardChrome,
}: {
    layout?: ProductCardLayout;
    chrome?: ProductCardChrome;
} = {}) => {
    const variant = resolveVariant(layout, chrome);
    return (
        <div
            data-skeleton
            data-variant={variant}
            data-layout={layout}
            data-chrome={chrome}
            className="border-(length:--product-card-border-width) border-(color:var(--product-card-border-color)) relative flex min-h-[18rem] w-full snap-center snap-always overflow-hidden rounded-(--product-card-radius) border-solid bg-(--product-card-bg) p-(--product-card-padding)"
        />
    );
};

(ProductCard.skeleton as unknown as { displayName: string }).displayName = 'Nordcom.ProductCard.Skeleton';

export default ProductCard;
