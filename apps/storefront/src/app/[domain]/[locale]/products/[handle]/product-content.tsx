'use client';

import { trace } from '@opentelemetry/api';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { ProductVariant, Product as StorefrontProduct } from '@shopify/hydrogen-react/storefront-api-types';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { Product } from '@/api/product';
import { Price } from '@/components/products/price';
import { ProductActionsContainer } from '@/components/products/product-actions-container';
import { QuantityProvider } from '@/components/products/quantity-provider';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';

/**
 * Determines the initial variant ID from URL search params.
 * Prefers `?variant=<id>` param; falls back to matching by option name/value
 * params (e.g. `?Color=Red&Size=M`); then falls back to firstAvailableVariant.
 *
 * @param product - Product whose variants are searched for a match.
 * @param searchParams - Current URL search params.
 * @returns The Shopify variant GID to pre-select, or `undefined`.
 */
export function resolveInitialVariantId(product: Product, searchParams: URLSearchParams): string | undefined {
    if (searchParams.has('variant')) {
        return `gid://shopify/ProductVariant/${searchParams.get('variant')}`;
    }

    // Try to match by option params — e.g. ?Color=Red&Size=M
    const optionNames = product.options?.map((o: { name: string }) => o.name) ?? [];
    const optionEntries = optionNames
        .map((name: string) => ({ name, value: searchParams.get(name) }))
        .filter((o): o is { name: string; value: string } => o.value !== null);

    if (optionEntries.length > 0) {
        const matched = product.variants.edges.find(({ node }) =>
            optionEntries.every(({ name, value }) =>
                node.selectedOptions?.some(
                    (so: { name: string; value: string }) => so.name === name && so.value === value,
                ),
            ),
        )?.node;
        if (matched) return matched.id;
    }

    return firstAvailableVariant(product)?.id;
}

import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { unsafe_cast } from '@/utils/unsafe-cast';

/** Props for the `ProductContent` client component. */
export type ProductContentProps = {
    product: Product;
    i18n: LocaleDictionary;
};
/**
 * Client component that wires the Hydrogen `ProductProvider` and
 * `QuantityProvider` around the product actions UI. Reads the `variant`
 * search param to pre-select a specific variant; falls back to the first
 * available variant when absent.
 *
 * @param product - The product data including variants and availability.
 * @param i18n - The locale dictionary for translated labels in the actions UI.
 * @returns The product actions section with variant selection and add-to-cart.
 */
export function ProductContent({ product, i18n }: ProductContentProps) {
    const searchParams = useSearchParams();
    const initialVariantId = useMemo(() => resolveInitialVariantId(product, searchParams), [product, searchParams]);

    const [quantity, setQuantity] = useState(1);

    return (
        // hydrogen-react's `Product` is `RecursivePartial<Product>`; our local
        // `Product` type is a stricter superset that satisfies the runtime
        // contract. The library types are intentionally permissive — this is
        // the documented escape hatch.
        <ProductProvider data={unsafe_cast<StorefrontProduct>(product)} initialVariantId={initialVariantId}>
            <QuantityProvider quantity={quantity} setQuantity={setQuantity}>
                <ProductActionsContainer i18n={i18n} />
            </QuantityProvider>
        </ProductProvider>
    );
}

/** Props for the `ProductSavings` client component. */
export type ProductSavingsProps = {
    product: Product;
    i18n: LocaleDictionary;
    className?: string;
};
/**
 * Client component that displays a sale savings badge for the currently
 * selected variant. Returns `null` when the product is unavailable, the
 * variant has no compare-at price, or the computed savings are negative.
 *
 * @param i18n - The locale dictionary for translated savings copy.
 * @param product - The product data used to locate the active variant and pricing.
 * @param className - Optional extra class names applied to the badge element.
 * @returns The savings badge, or `null` when there are no savings to display.
 */
export function ProductSavings({ i18n, product, className }: ProductSavingsProps) {
    const searchParams = useSearchParams();
    const variant = useMemo(
        () =>
            searchParams.has('variant')
                ? product.variants.edges.find(({ node: { id } }) => id.includes(searchParams.get('variant')!))?.node
                : firstAvailableVariant(product),
        [product, searchParams],
    );
    const { t } = getTranslations('product', i18n);

    if (!variant || !product.availableForSale) {
        return null;
    }

    const price = variant.price as ProductVariant['price'] | undefined;
    const compareAtPrice = variant.compareAtPrice;
    if (!price || !compareAtPrice) {
        return null;
    }

    const totalAmount = safeParseFloat(0, price.amount);
    const compareAtAmount = safeParseFloat(0, compareAtPrice.amount);

    const savings = compareAtAmount - totalAmount;
    if (savings < 0) {
        trace.getActiveSpan()?.addEvent('product.negative_savings', {
            'product.id': product.id,
            'product.savings': savings,
        });
        return null;
    }

    const discount = Math.round((100 * (compareAtAmount - totalAmount)) / Math.max(1, compareAtAmount));

    return (
        <div
            className={cn(
                'flex items-center justify-between gap-1 rounded-lg bg-sale-stripes p-2 px-4 font-semibold text-[0.82rem] text-white md:px-5 md:text-sm',
                className,
            )}
        >
            <div className="flex items-center gap-1">
                {t(
                    'save-n-per-item',
                    <Price
                        key={savings}
                        data={{
                            amount: savings.toString(),
                            currencyCode: price.currencyCode,
                        }}
                        className="font-black"
                    />,
                )}
            </div>

            <div className="flex items-center gap-1 font-black">
                {t('percentage-off', discount)}
                <span className="hidden xl:block">&mdash;</span>
                <span className="hidden font-bold xl:block">{t('what-a-deal')}</span>
            </div>
        </div>
    );
}
