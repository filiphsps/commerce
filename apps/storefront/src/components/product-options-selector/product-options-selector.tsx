'use client';

import type { ComponentType, HTMLProps } from 'react';
import { useCallback, useMemo } from 'react';
import type { ProductVariant } from '@/api/product';
import { defaultRenderers } from '@/components/product-options-selector/renderers';
import type {
    OptionValueSwatch,
    ProductOptionValueRendererProps,
    RenderDensity,
} from '@/components/product-options-selector/renderers/types';
import { Label } from '@/components/typography/label';
import { filterRealOptions } from '@/utils/has-product-options';
import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type SelectedOptions = Record<string, string>;

export type { ProductOptionValueRendererProps, RenderDensity };

export type ProductOptionsSelectorProps = {
    // Accept any-shape options for flexibility against hydrogen-react's
    // MappedProductOptions[]; the selector only reads name + optionValues.
    options: ReadonlyArray<{
        id?: string;
        name: string;
        optionValues: ReadonlyArray<{
            name: string;
            available: boolean;
            exists: boolean;
            selected?: boolean;
            isDifferentProduct: boolean;
            variantUriQuery?: string;
            variant: { id?: string; weight?: number | null; weightUnit?: string | null };
            swatch?: OptionValueSwatch;
        }>;
    }>;
    selectedOptions: SelectedOptions;
    onChange: (next: SelectedOptions) => void;

    renderers?: Partial<Record<string, ComponentType<ProductOptionValueRendererProps>>>;
    productHandle?: string;
    /** When supplied, hrefs are prefixed with `/{locale.code}/` so the middleware does not 301-redirect to add the locale segment. */
    locale?: Locale;
    density?: RenderDensity;
    maxValuesPerOption?: number;
} & Omit<HTMLProps<HTMLDivElement>, 'onChange' | 'children'>;

type SelectorOption = ProductOptionsSelectorProps['options'][number];
type SelectorOptionValue = SelectorOption['optionValues'][number];

/**
 * Renders the full set of product option groups, delegating value rendering to pluggable renderer components.
 *
 * @param props.options - Array of product option groups with their available values.
 * @param props.selectedOptions - Map of option name to currently selected value.
 * @param props.onChange - Callback invoked with the updated selection map on any value change.
 * @param props.renderers - Optional per-option-name renderer overrides; falls back to `defaultRenderers.default`.
 * @param props.productHandle - Product handle used to build variant deep-link hrefs when provided.
 * @param props.density - Visual density mode forwarded to each value renderer.
 * @param props.maxValuesPerOption - Optional cap on displayed values per option group.
 * @returns The option group container, or `null` when no real options exist.
 */
export const ProductOptionsSelector = ({
    options,
    selectedOptions,
    onChange,
    renderers,
    productHandle,
    locale,
    density = 'spacious',
    maxValuesPerOption,
    className,
    ...rest
}: ProductOptionsSelectorProps) => {
    const realOptions = useMemo<SelectorOption[]>(
        () => filterRealOptions(options as readonly SelectorOption[] as SelectorOption[]),
        [options],
    );

    const onSelectFor = useCallback(
        (name: string, value: string) => () => onChange({ ...selectedOptions, [name]: value }),
        [onChange, selectedOptions],
    );

    if (realOptions.length === 0) {
        return null;
    }

    return (
        <div {...rest} className={cn('flex flex-col gap-(--block-spacer-small)', className)}>
            {realOptions.map((option) => {
                const values =
                    typeof maxValuesPerOption === 'number'
                        ? option.optionValues.slice(0, maxValuesPerOption)
                        : option.optionValues;

                return (
                    <div key={option.name} className="flex flex-col gap-(--block-spacer-small)">
                        {density === 'spacious' ? (
                            <Label className="text-(color:var(--text-muted)) h-fit">{option.name}</Label>
                        ) : null}

                        <div className="flex flex-wrap gap-(--block-spacer-small)">
                            {values.map((v: SelectorOptionValue) => {
                                const Renderer =
                                    renderers?.[option.name] ?? renderers?.default ?? defaultRenderers.default!;

                                const href =
                                    productHandle && v.variantUriQuery
                                        ? `${locale ? `/${locale.code}` : ''}/products/${productHandle}/?${v.variantUriQuery}`
                                        : undefined;

                                return (
                                    <Renderer
                                        key={`${option.name}_${v.name}`}
                                        name={option.name}
                                        value={v.name}
                                        selected={selectedOptions[option.name] === v.name}
                                        available={v.available}
                                        exists={v.exists}
                                        isDifferentProduct={v.isDifferentProduct}
                                        variant={v.variant as ProductVariant}
                                        swatch={v.swatch}
                                        href={href}
                                        onSelect={onSelectFor(option.name, v.name)}
                                        density={density}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

ProductOptionsSelector.displayName = 'Nordcom.ProductOptionsSelector';
