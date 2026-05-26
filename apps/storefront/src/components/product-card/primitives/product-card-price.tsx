import type { ProductVariant } from '@/api/product';
import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type ProductCardPriceProps = {
    seedVariant: ProductVariant;
    locale: Locale;
    className?: string;
};

const ProductCardPrice = ({ seedVariant, locale, className }: ProductCardPriceProps) => {
    const current = seedVariant.price;
    const compare = seedVariant.compareAtPrice;
    const onSale = !!compare && Number(compare.amount) > Number(current.amount);

    const fmt = new Intl.NumberFormat(locale.code, {
        style: 'currency',
        currency: current.currencyCode,
        minimumFractionDigits: 0,
    });

    return (
        <div
            {...(onSale ? { 'data-on-sale': '' } : {})}
            className={cn('flex items-baseline gap-1.5 flex-wrap', className)}
        >
            <span
                className={cn(
                    'text-sm font-semibold leading-none tabular-nums',
                    'text-(--product-card-price-color)',
                    onSale && 'group-data-[on-sale]/card:text-(--product-card-sale-current-color)',
                )}
            >
                {fmt.format(Number(current.amount))}
            </span>
            {onSale && compare ? (
                <span
                    className="relative px-0.5 text-xs font-medium leading-none tabular-nums text-(--product-card-compare-color) after:content-[''] after:absolute after:inset-x-[calc(-1*var(--product-card-sale-strike-extend))] after:top-1/2 after:h-px after:bg-(--product-card-sale-strike-color,currentColor) after:-translate-y-1/2 after:[transform:translateY(-50%)_rotate(var(--product-card-sale-strike-angle))]"
                >
                    {fmt.format(Number(compare.amount))}
                </span>
            ) : null}
        </div>
    );
};

ProductCardPrice.displayName = 'Nordcom.ProductCard.Price';
export default ProductCardPrice;
