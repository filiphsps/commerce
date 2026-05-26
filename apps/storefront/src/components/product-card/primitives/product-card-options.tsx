import type { Product } from '@/api/product';
import * as ProductOptions from '@/components/product-options';

export type ProductCardOptionsProps = {
    product: Product;
    className?: string;
};

const ProductCardOptions = ({ product, className }: ProductCardOptionsProps) => {
    const realOptions = (product.options ?? []).filter((o) => o.name && o.name.toLowerCase() !== 'title');
    if (realOptions.length === 0) return null;
    return (
        <div className={className ?? 'flex w-full flex-col gap-1'}>
            {realOptions.map((o) => (
                <div key={o.name} className="relative flex flex-wrap items-center gap-(--product-card-swatch-gap)">
                    <ProductOptions.Group name={o.name} />
                    <ProductOptions.Overlay groupName={o.name} />
                </div>
            ))}
        </div>
    );
};

ProductCardOptions.displayName = 'Nordcom.ProductCard.Options';
export default ProductCardOptions;
