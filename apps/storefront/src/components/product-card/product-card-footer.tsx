'use client';

import type { ComponentProps, ElementType, ReactNode } from 'react';
import { Fragment, Suspense } from 'react';
import type { Product, ProductVariant } from '@/api/product';
import ProductCardActions from '@/components/product-card/product-card-actions';
import ProductCardOptions from '@/components/product-card/product-card-options';
import { hasProductOptions } from '@/utils/has-product-options';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type ProductCardFooterWrapperProps<T extends ElementType> = {
    data?: Product;
    children: ReactNode;
} & ComponentProps<T>;
export const ProductCardFooterWrapper = <T extends ElementType>({
    as: Tag = 'div' as T,
    data: product,
    children,
    className,
    ...props
}: ProductCardFooterWrapperProps<T>) => {
    if (!hasProductOptions(product)) {
        return children;
    }

    return (
        <Tag {...props} className={cn('flex flex-col items-end gap-1', className)}>
            {children}
        </Tag>
    );
};

export type ProductCardFooterProps = {
    data?: Product;
    selected?: ProductVariant;
    setSelected: (variant: () => ProductVariant) => void;
    locale: Locale;
    i18n: LocaleDictionary;
};
const ProductCardFooter = ({ data: product, selected, setSelected, i18n, locale }: ProductCardFooterProps) => {
    if (!product) {
        return null;
    }

    return (
        <ProductCardFooterWrapper data={product}>
            <ProductCardOptions
                locale={locale}
                data={product}
                selectedVariant={selected}
                // FIXME: Handle setSelectedVariant better so that we can server render.
                setSelectedVariant={(variant) => setSelected(() => variant)}
            />

            {selected ? (
                <Suspense fallback={<Fragment />}>
                    <ProductCardActions i18n={i18n} data={product} selectedVariant={selected} />
                </Suspense>
            ) : null}
        </ProductCardFooterWrapper>
    );
};

ProductCardFooter.displayName = 'Nordcom.ProductCard.Footer';
export default ProductCardFooter;
