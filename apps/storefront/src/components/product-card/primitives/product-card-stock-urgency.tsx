'use client';

import { useProductCardContext } from '@/components/product-card/context';
import { cn } from '@/utils/tailwind';

const DEFAULT_THRESHOLD = 5;

export type ProductCardStockUrgencyProps = {
    threshold?: number;
    className?: string;
};

const ProductCardStockUrgency = ({ threshold = DEFAULT_THRESHOLD, className }: ProductCardStockUrgencyProps) => {
    const { selected } = useProductCardContext();
    if (!selected) {
        return null;
    }

    const quantity = (selected as { quantityAvailable?: number | null }).quantityAvailable;
    if (typeof quantity !== 'number' || quantity <= 0 || quantity > threshold) {
        return null;
    }

    return (
        <p
            data-testid="product-card-stock-urgency"
            aria-live="off"
            className={cn(
                'm-0 inline-block',
                '[font-size:var(--product-card-urgency-size)]',
                '[font-weight:var(--product-card-urgency-weight)]',
                '[color:var(--product-card-urgency-color)]',
                className,
            )}
        >
            {`Only ${quantity} left`}
        </p>
    );
};

ProductCardStockUrgency.displayName = 'Nordcom.ProductCard.StockUrgency';
export default ProductCardStockUrgency;
