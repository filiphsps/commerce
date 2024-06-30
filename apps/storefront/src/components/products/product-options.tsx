'use client';

import actionsStyles from '@/components/products/product-actions-container.module.scss';
import styles from '@/components/products/product-options.module.scss';

import { Fragment, type HTMLProps } from 'react';

import { ConvertToLocalMeasurementSystem } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { parseGid, useProduct } from '@shopify/hydrogen-react';

import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';
import { Label } from '@/components/typography/label';

export type ProductOptionProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export const ProductOptions = ({ className, ...props }: ProductOptionProps) => {
    const { locale } = useShop();

    const {
        options: productOptions,
        variants,
        selectedOptions,
        setSelectedOptions,
        isOptionInStock,
        product
    } = useProduct();

    if (!product) {
        console.error('No product found. Have you wrapped your component in a `<ProductProvider>`?');
        return null;
    } else if (!product.variants) {
        console.error('No product variants found. Something has gone really wrong.');
        return null;
    }
    const { handle } = product;

    // Filter out options that have only one value and that value is "Default Title".
    // This is a Shopify default value that is not useful to the user.
    // TODO: Figure out how to handle this properly.
    const options = productOptions?.filter(
        (option) =>
            option?.values && !(option.values.length === 1 && option.values[0]!.toLowerCase() === 'default title')
    );

    return (
        <div {...props} className={`${actionsStyles['product-options']} ${className || ''}`}>
            {options?.map(
                (option, index) =>
                    option?.values ? (
                        <Fragment key={`${option.name}_option`}>
                            <Label
                                className="text-gray-600"
                                data-options={option.values.length}
                                suppressHydrationWarning={true}
                            >
                                {option.name}
                            </Label>
                            <div
                                className={styles.options}
                                data-options={option.values.length}
                                suppressHydrationWarning={true}
                            >
                                {option.values.map((value) => {
                                    if (!value || !variants) return null;

                                    // FIXME: Handle options to variant properly.
                                    const matchingVariant = variants.find((variant) =>
                                        variant!.title?.toLowerCase().includes(value.toLowerCase())
                                    );

                                    let href = `/products/${handle}/`;
                                    if (matchingVariant?.id) {
                                        href = `${href}?variant=${parseGid(matchingVariant.id).id}`;
                                    }

                                    const inStock = isOptionInStock(option.name!, value!);
                                    const isSelected = selectedOptions?.[option.name!] === value;

                                    const title = `${product.vendor} ${product.title} - ${matchingVariant?.title}`;
                                    const label =
                                        matchingVariant && option.name === 'Size'
                                            ? ConvertToLocalMeasurementSystem({
                                                  locale,
                                                  weight: matchingVariant.weight!,
                                                  weightUnit: matchingVariant.weightUnit!
                                              })
                                            : null;

                                    return (
                                        <Link
                                            key={`${option.name}_${value}`}
                                            aria-disabled={!inStock}
                                            aria-selected={isSelected}
                                            title={title}
                                            className={cn(
                                                styles.option,
                                                isSelected && styles.selected,
                                                !inStock && styles.disabled,
                                                styles.clickable,
                                                'text-sm'
                                            )}
                                            onClick={() =>
                                                setSelectedOptions({
                                                    ...(selectedOptions as any),
                                                    [option.name!]: value!
                                                })
                                            }
                                            locale={locale}
                                            href={href}
                                            replace={true}
                                            shallow={true}
                                            prefetch={false}
                                            // The user's locale might differ from ours.
                                            suppressHydrationWarning={true}
                                        >
                                            {label || title}
                                        </Link>
                                    );
                                })}
                            </div>
                        </Fragment>
                    ) : (
                        <div key={`empty_${index}`} />
                    ) // Empty div to keep the grid layout
            )}
        </div>
    );
};
ProductOptions.displayName = 'Nordcom.Products.Options';

export const ProductOptionsSkeleton = () => {
    return <div className={actionsStyles['product-options']} />;
};
ProductOptionsSkeleton.displayName = 'Nordcom.Products.Options.Skeleton';
