'use client';

import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { Product, ProductVariant } from '@/api/product';
import { ProductOptionsContext, useMaybeProductOptions } from './context';
import { findVariant, resolveOptions } from './resolver';
import type { OptionValueRenderer, ProductOptionsContextValue } from './types';

export type ProductOptionsRootProps = {
    product: Product;
    initialSelection?: Record<string, string>;
    selection?: Record<string, string>;
    onChange?: (next: Record<string, string>) => void;
    renderers?: Record<string, OptionValueRenderer>;
    children?: ReactNode;
};

function normalizeRenderers(
    input: Record<string, OptionValueRenderer> | undefined,
): Record<string, OptionValueRenderer> {
    if (!input) return {};
    return Object.fromEntries(Object.entries(input).map(([k, v]) => [k.toLowerCase(), v]));
}

const InnerRoot = ({
    product,
    initialSelection,
    selection: controlledSelection,
    onChange,
    renderers,
    children,
}: ProductOptionsRootProps) => {
    const controlled = controlledSelection !== undefined;
    const [internal, setInternal] = useState<Record<string, string>>(initialSelection ?? {});
    const selection = controlled ? controlledSelection : internal;

    const selectVariant = useCallback(
        (next: Record<string, string>) => {
            if (!controlled) setInternal(next);
            onChange?.(next);
        },
        [controlled, onChange],
    );

    const resolved = useMemo(() => resolveOptions(product, selection), [product, selection]);
    const selectedVariant = useMemo(() => findVariant(product, selection), [product, selection]);
    const [hoveredVariant, setHoveredVariant] = useState<ProductVariant | undefined>(undefined);

    const normalizedRenderers = useMemo(() => normalizeRenderers(renderers), [renderers]);

    const value = useMemo<ProductOptionsContextValue>(
        () => ({
            product,
            resolved,
            selection,
            selectVariant,
            selectedVariant,
            hoveredVariant,
            setHoveredVariant,
            renderers: normalizedRenderers,
        }),
        [product, resolved, selection, selectVariant, selectedVariant, hoveredVariant, normalizedRenderers],
    );

    return <ProductOptionsContext.Provider value={value}>{children}</ProductOptionsContext.Provider>;
};

const Root = (props: ProductOptionsRootProps) => {
    const parent = useMaybeProductOptions();
    if (parent) return <>{props.children}</>;
    return <InnerRoot {...props} />;
};

Root.displayName = 'Nordcom.ProductOptions.Root';
export default Root;
