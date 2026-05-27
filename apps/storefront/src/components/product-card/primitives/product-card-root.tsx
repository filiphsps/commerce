import type { ReactNode } from 'react';
import type { Product } from '@/api/product';
import { Card } from '@/components/layout/card';
import { cn } from '@/utils/tailwind';

export type ProductCardLayout = 'vertical' | 'horizontal';
export type ProductCardChrome = 'boxed' | 'frameless';

export type ProductCardRootProps = {
    data: Product;
    layout: ProductCardLayout;
    chrome: ProductCardChrome;
    onSale?: boolean;
    className?: string;
    children: ReactNode;
};

/**
 * Root `<article>` wrapper for the product card, applying layout, chrome, and availability data attributes.
 *
 * @param props.data - Product record used to derive out-of-stock state.
 * @param props.layout - Card orientation; controls flex direction and minimum height.
 * @param props.chrome - Visual frame style; `'boxed'` adds a shadow border.
 * @param props.onSale - When `true`, sets a `data-on-sale` attribute for sale-specific styling.
 * @param props.className - Additional CSS class names.
 * @param props.children - Card content slots.
 * @returns The `Card` article element.
 */
const ProductCardRoot = ({ data, layout, chrome, onSale, className, children }: ProductCardRootProps) => {
    const isOos = data.availableForSale === false;

    return (
        <Card
            as="article"
            chrome={chrome}
            data-testid="product-card-root"
            data-layout={layout}
            data-chrome={chrome}
            {...(isOos ? { 'data-availability': 'out-of-stock' } : {})}
            {...(onSale ? { 'data-on-sale': '' } : {})}
            className={cn(
                'group/card relative flex w-full',
                'min-w-(--product-card-min-width) max-w-(--product-card-max-width)',
                'gap-(--block-spacer)',
                'transition-shadow duration-(--product-card-motion-base) ease-(--product-card-motion-ease)',
                chrome === 'boxed' &&
                    'shadow-product-card focus-within:shadow-product-card-hover hover:shadow-product-card-hover',
                layout === 'vertical' && 'min-h-72 flex-col',
                layout === 'horizontal' && 'flex-row items-stretch',
                isOos && 'opacity-(--product-card-oos-opacity)',
                className,
            )}
        >
            {children}
        </Card>
    );
};

ProductCardRoot.displayName = 'Nordcom.ProductCard.Root';
export default ProductCardRoot;
