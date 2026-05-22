'use client';

import type { ComponentProps, ElementType, ReactNode } from 'react';
import { Fragment, Suspense } from 'react';
import type { Product, ProductVariant } from '@/api/product';
import { ProductCardContextProvider } from '@/components/product-card/context';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
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
        <ProductCardContextProvider
            value={{
                variant: 'vertical-boxed',
                data: product,
                selected,
                setSelected: (updater) => setSelected(() => updater(selected)),
                hoveredImage: undefined,
                setHoveredImage: () => {},
                i18n,
                locale,
                priority: false,
            }}
        >
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
                        <ProductCardActions />
                    </Suspense>
                ) : null}
            </ProductCardFooterWrapper>
        </ProductCardContextProvider>
    );
};

ProductCardFooter.displayName = 'Nordcom.ProductCard.Footer';
export default ProductCardFooter;
