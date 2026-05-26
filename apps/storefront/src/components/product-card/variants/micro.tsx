import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product, ProductVariant } from '@/api/product';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
import ProductCardImage from '@/components/product-card/primitives/product-card-image';
import ProductCardPrice from '@/components/product-card/primitives/product-card-price';
import ProductCardTitle from '@/components/product-card/primitives/product-card-title';
import { filterRealOptions } from '@/utils/has-product-options';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type MicroProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    product: Product;
    seedVariant: ProductVariant;
    priority: boolean;
    aspect: 'vertical' | 'horizontal' | 'micro';
};

const Micro = ({ shop, locale, i18n, product, seedVariant, priority, aspect }: MicroProps) => {
    const realOptions = filterRealOptions(product.options ?? []);
    const totalVariants = realOptions.reduce((acc, o) => acc * o.values.length, 1);

    return (
        <>
            <div className="relative h-10 w-10 shrink-0">
                <ProductCardImage product={product} seedVariant={seedVariant} priority={priority} aspect={aspect} />
            </div>
            <div className="flex min-w-0 grow flex-col">
                <div className="truncate">
                    <ProductCardTitle shop={shop} data={product} />
                </div>
                {totalVariants > 1 ? (
                    <span
                        className={cn(
                            '[font-size:var(--product-card-vendor-size)]',
                            '[color:var(--product-card-vendor-color)]',
                        )}
                    >
                        {totalVariants} variants
                    </span>
                ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <ProductCardPrice seedVariant={seedVariant} locale={locale} />
                <ProductCardActions product={product} seedVariant={seedVariant} i18n={i18n} mode="icon" />
            </div>
        </>
    );
};

Micro.displayName = 'Nordcom.ProductCard.Variant.Micro';
export default Micro;
