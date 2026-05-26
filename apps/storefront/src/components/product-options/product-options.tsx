'use client';

import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Product, ProductVariant } from '@/api/product';
import { ProductOptionsContext, useMaybeProductOptions } from './context';
import { findVariant, resolveOptions } from './resolver';
import type { OptionValueRenderer, ProductOptionsContextValue, Selection } from './types';

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
    const [internal, setInternal] = useState<Selection>(initialSelection ?? {});
    const selection = controlled ? controlledSelection : internal;

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const selectVariant = useCallback(
        (next: Selection) => {
            if (!controlled) setInternal(next);
            onChangeRef.current?.(next);
        },
        [controlled],
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
    if (parent) {
        if (process.env.NODE_ENV !== 'production') {
            const dropped: string[] = [];
            if (props.onChange) dropped.push('onChange');
            if (props.renderers) dropped.push('renderers');
            if (props.initialSelection) dropped.push('initialSelection');
            if (props.selection) dropped.push('selection');
            if (dropped.length > 0) {
                console.warn(
                    `<ProductOptions.Root> nested inside an existing provider — these props are ignored: ${dropped.join(', ')}. The outer provider's state is in scope.`,
                );
            }
        }
        return <>{props.children}</>;
    }
    return <InnerRoot key={props.product.handle} {...props} />;
};

Root.displayName = 'Nordcom.ProductOptions.Root';
export default Root;
