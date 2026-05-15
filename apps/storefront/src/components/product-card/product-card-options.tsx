'use client';

import { getProductOptions, mapSelectedProductOptionToObject } from '@shopify/hydrogen-react';
import { useMemo, useState } from 'react';
import type { Product, ProductVariant } from '@/api/product';
import { ProductOptionsSelector, type SelectedOptions } from '@/components/product-options-selector';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { hasProductOptions } from '@/utils/has-product-options';
import type { Locale } from '@/utils/locale';

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

    // biome-ignore lint/suspicious/noExplicitAny: local Product type is a stricter superset of hydrogen-react's RecursivePartial<Product>
    const mappedOptions = useMemo(() => (product ? getProductOptions(product as any) : []), [product]);

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
            setSelectedVariant(valueEntry.variant as unknown as ProductVariant);
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
