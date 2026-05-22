'use client';

import { useProductCardContext } from '@/components/product-card/context';
import { Pricing } from '@/components/typography/pricing';
import { cn } from '@/utils/tailwind';

export type ProductCardPriceProps = {
    className?: string;
};

const ProductCardPrice = ({ className }: ProductCardPriceProps) => {
    const { selected } = useProductCardContext();
    if (!selected?.price) {
        return null;
    }

    const { price, compareAtPrice } = selected;
    const onSale = compareAtPrice && price ? compareAtPrice.amount !== price.amount : false;

    return (
        <div className={cn('flex flex-wrap items-baseline justify-start gap-1.5', className)}>
            <Pricing
                price={price}
                className={cn(
                    '[font-size:var(--product-card-price-size)]',
                    '[font-weight:var(--product-card-price-weight)]',
                    '[color:var(--product-card-price-color)]',
                    onSale && '[color:var(--product-card-price-sale-color)]',
                )}
            />
            {onSale && compareAtPrice ? (
                <Pricing
                    price={compareAtPrice}
                    className={cn(
                        'leading-none line-through',
                        '[font-size:calc(var(--product-card-price-size)*0.8)]',
                        '[color:var(--product-card-price-compare-color)]',
                    )}
                />
            ) : null}
        </div>
    );
};

ProductCardPrice.displayName = 'Nordcom.ProductCard.Price';
export default ProductCardPrice;
