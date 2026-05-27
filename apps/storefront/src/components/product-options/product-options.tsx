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

/**
 * Lowercases all keys of a renderer map so lookups are case-insensitive.
 *
 * @param input - Optional renderer map with arbitrary-case keys.
 * @returns A new map with all keys lowercased, or an empty object when `input` is undefined.
 */
function normalizeRenderers(
    input: Record<string, OptionValueRenderer> | undefined,
): Record<string, OptionValueRenderer> {
    if (!input) return {};
    return Object.fromEntries(Object.entries(input).map(([k, v]) => [k.toLowerCase(), v]));
}

/**
 * Mounts the `ProductOptionsContext` provider with internally managed or controlled selection state.
 *
 * @param props.product - Product whose options and variants are resolved.
 * @param props.initialSelection - Uncontrolled initial selection map.
 * @param props.selection - Controlled selection map; when provided, the component is fully controlled.
 * @param props.onChange - Callback invoked on every selection change.
 * @param props.renderers - Custom per-option-name renderer overrides.
 * @param props.children - Context consumers.
 * @returns The context provider wrapping `children`.
 */
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

/**
 * Public root component for product options; passes through to the nearest parent provider when nested.
 *
 * @param props.product - Product whose options are managed by this root.
 * @param props.children - Option group and value primitives that consume the context.
 * @returns The `InnerRoot` provider, or a transparent fragment when a parent provider already exists.
 */
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
