'use client';

import type { ComponentType, HTMLProps } from 'react';
import { useCallback, useMemo } from 'react';
import styles from '@/components/product-options-selector/product-options-selector.module.scss';
import { defaultRenderers } from '@/components/product-options-selector/renderers';
import type {
    ProductOptionValueRendererProps,
    RenderDensity,
} from '@/components/product-options-selector/renderers/types';
import { Label } from '@/components/typography/label';
import { filterRealOptions } from '@/utils/has-product-options';
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
        }>;
    }>;
    selectedOptions: SelectedOptions;
    onChange: (next: SelectedOptions) => void;

    renderers?: Partial<Record<string, ComponentType<ProductOptionValueRendererProps>>>;
    productHandle?: string;
    density?: RenderDensity;
    maxValuesPerOption?: number;
} & Omit<HTMLProps<HTMLDivElement>, 'onChange' | 'children'>;

export const ProductOptionsSelector = ({
    options,
    selectedOptions,
    onChange,
    renderers,
    productHandle,
    density = 'spacious',
    maxValuesPerOption,
    className,
    ...rest
}: ProductOptionsSelectorProps) => {
    const realOptions = useMemo(() => filterRealOptions(options as any[]), [options]);

    const onSelectFor = useCallback(
        (name: string, value: string) => () => onChange({ ...selectedOptions, [name]: value }),
        [onChange, selectedOptions],
    );

    if (realOptions.length === 0) {
        return null;
    }

    return (
        <div {...rest} className={cn(styles.root, className)}>
            {realOptions.map((option: any) => {
                const values =
                    typeof maxValuesPerOption === 'number'
                        ? option.optionValues.slice(0, maxValuesPerOption)
                        : option.optionValues;

                return (
                    <div key={option.name} className={styles.optionGroup}>
                        {density === 'spacious' ? (
                            <Label className="h-fit text-gray-600">{option.name}</Label>
                        ) : null}

                        <div className={styles.values}>
                            {values.map((v: any) => {
                                const Renderer =
                                    renderers?.[option.name] ??
                                    renderers?.default ??
                                    defaultRenderers.default!;

                                const href =
                                    productHandle && v.variantUriQuery
                                        ? `/products/${productHandle}/?${v.variantUriQuery}`
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
                                        variant={v.variant}
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
