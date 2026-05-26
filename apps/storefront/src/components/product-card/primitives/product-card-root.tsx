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
    className?: string;
    children: ReactNode;
};

const ProductCardRoot = ({ data, layout, chrome, className, children }: ProductCardRootProps) => {
    const isOos = data.availableForSale === false;

    return (
        <Card
            as="article"
            chrome={chrome}
            data-testid="product-card-root"
            data-layout={layout}
            data-chrome={chrome}
            {...(isOos ? { 'data-availability': 'out-of-stock' } : {})}
            className={cn(
                'group/card relative flex w-full',
                'min-w-(--product-card-min-width) max-w-(--product-card-max-width)',
                'gap-(--block-spacer)',
                'transition-shadow duration-(--product-card-motion-base) ease-(--product-card-motion-ease)',
                chrome === 'boxed' && 'shadow-product-card hover:shadow-product-card-hover focus-within:shadow-product-card-hover',
                layout === 'vertical' && 'flex-col min-h-72',
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
