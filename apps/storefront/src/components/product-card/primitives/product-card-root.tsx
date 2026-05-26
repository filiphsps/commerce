import type { ReactNode } from 'react';
import type { Product } from '@/api/product';
import * as ProductOptions from '@/components/product-options';
import { toSelectionRecord } from '@/components/product-options/resolver';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { cn } from '@/utils/tailwind';
import styles from '../product-card.module.css';

export type ProductCardRootProps = {
    data: Product;
    variant: string;
    className?: string;
    children: ReactNode;
};

const ProductCardRoot = ({ data, variant, className, children }: ProductCardRootProps) => {
    const seed = firstAvailableVariant(data) ?? data.variants?.edges?.[0]?.node;
    const seedSelection = toSelectionRecord(seed);

    const isBare = variant.endsWith('-bare');
    const isHorizontal = variant.startsWith('horizontal');
    const isMicro = variant === 'micro';

    const containerStyles = cn(
        styles.productCardRoot,
        'group/card relative flex w-full snap-center snap-always overflow-hidden transition-shadow',
        '[transition-duration:var(--product-card-motion-hover-duration)]',
        '[transition-timing-function:var(--product-card-motion-hover-ease)]',
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
        <article
            data-testid="product-card-root"
            data-variant={variant}
            data-layout={isMicro ? 'micro' : isHorizontal ? 'horizontal' : 'vertical'}
            data-chrome={isBare ? 'bare' : 'boxed'}
            className={containerStyles}
        >
            <ProductOptions.Root product={data} initialSelection={seedSelection}>
                {children}
            </ProductOptions.Root>
        </article>
    );
};

ProductCardRoot.displayName = 'Nordcom.ProductCard.Root';
export default ProductCardRoot;
