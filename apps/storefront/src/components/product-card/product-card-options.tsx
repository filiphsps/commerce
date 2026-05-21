'use client';

import { getProductOptions, mapSelectedProductOptionToObject } from '@shopify/hydrogen-react';
import { useMemo, useState } from 'react';
import type { Product, ProductVariant } from '@/api/product';
import { ProductOptionsSelector, type SelectedOptions } from '@/components/product-options-selector';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { hasProductOptions } from '@/utils/has-product-options';
import type { Locale } from '@/utils/locale';
import { unsafe_cast } from '@/utils/unsafe-cast';

export type ProductCardOptionsProps = {
    locale: Locale;
    data: Product;
    selectedVariant?: ProductVariant | undefined;
    setSelectedVariant(variant: ProductVariant): void;
};

const ProductCardOptions = ({ data: product, selectedVariant, setSelectedVariant }: ProductCardOptionsProps) => {
    const seed = selectedVariant ?? firstAvailableVariant(product);

    const [selected, setSelected] = useState<SelectedOptions>(() =>
        mapSelectedProductOptionToObject((seed?.selectedOptions ?? []) as Array<{ name: string; value: string }>),
    );

    // getProductOptions expects RecursivePartial<Product>; our local Product is
    // a stricter superset that satisfies the runtime contract.
    const mappedOptions = useMemo(() => (product ? getProductOptions(unsafe_cast(product)) : []), [product]);

    if (!hasProductOptions(product)) {
        return null;
    }

    const handleChange = (next: SelectedOptions) => {
        setSelected(next);
        const changed = Object.entries(next).find(([k, v]) => selected[k] !== v);
        if (!changed) return;
        const [name, value] = changed;
        const valueEntry = mappedOptions.find((o) => o.name === name)?.optionValues.find((v) => v.name === value);
        if (valueEntry?.variant) {
            // getProductOptions returns hydrogen-react's ProductVariant (RecursivePartial);
            // our local ProductVariant is the stricter superset the runtime satisfies.
            setSelectedVariant(unsafe_cast<ProductVariant>(valueEntry.variant));
        }
    };

    return (
        <ProductOptionsSelector
            options={mappedOptions}
            selectedOptions={selected}
            onChange={handleChange}
            density="compact"
            maxValuesPerOption={3}
            className="mt-1 inline-flex h-fit w-full shrink flex-wrap items-end justify-start gap-1"
        />
    );
};

ProductCardOptions.displayName = 'Nordcom.ProductCard.Options';
export default ProductCardOptions;
