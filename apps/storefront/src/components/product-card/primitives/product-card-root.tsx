'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { Product, ProductVariant } from '@/api/product';
import { ProductCardContextProvider, type ProductCardVariant, resolveVariant } from '@/components/product-card/context';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type ProductCardRootProps = {
    data: Product;
    variant: ProductCardVariant | string;
    i18n: LocaleDictionary;
    locale: Locale;
    initialVariant: ProductVariant | undefined;
    priority: boolean;
    className?: string;
    children: ReactNode;
};

const ProductCardRoot = ({
    data,
    variant,
    i18n,
    locale,
    initialVariant,
    priority,
    className,
    children,
}: ProductCardRootProps) => {
    const resolved = resolveVariant(variant);
    const seed = useMemo(() => initialVariant ?? firstAvailableVariant(data), [initialVariant, data]);
    const [selected, setSelectedState] = useState<ProductVariant | undefined>(seed);
    const [hoveredImage, setHoveredImage] = useState<ProductVariant['image'] | undefined>(undefined);

    const setSelected = (updater: (prev: ProductVariant | undefined) => ProductVariant) => {
        setSelectedState((prev) => updater(prev));
    };

    const isBare = resolved.endsWith('-bare');
    const isHorizontal = resolved.startsWith('horizontal');
    const isMicro = resolved === 'micro';

    const containerStyles = cn(
        'group/card relative flex w-full snap-center snap-always overflow-hidden transition-shadow',
        '[transition-duration:var(--product-card-motion-hover-duration)]',
        '[transition-timing-function:var(--product-card-motion-hover-ease)]',
        '[container-type:inline-size]',
        '[container-name:product-card]',
        !isBare && [
            'bg-(--product-card-bg)',
            'border-(length:--product-card-border-width) border-solid border-(color:var(--product-card-border-color))',
            'rounded-(--product-card-radius)',
            'shadow-(--product-card-shadow) hover:shadow-(--product-card-shadow-hover)',
            'p-(--product-card-padding)',
        ],
        !isHorizontal && !isMicro && 'min-h-[18rem] flex-col gap-(--product-card-gap)',
        isHorizontal && 'flex-row items-stretch gap-3',
        isMicro && 'flex-row items-center gap-2 p-(--product-card-padding)',
        !data.availableForSale && 'opacity-50',
        className,
    );

    return (
        <ProductCardContextProvider
            value={{
                variant: resolved,
                data,
                selected,
                setSelected,
                hoveredImage,
                setHoveredImage,
                i18n,
                locale,
                priority,
            }}
        >
            <div data-testid="product-card-root" data-variant={resolved} className={containerStyles}>
                {children}
            </div>
        </ProductCardContextProvider>
    );
};

ProductCardRoot.displayName = 'Nordcom.ProductCard.Root';
export default ProductCardRoot;
