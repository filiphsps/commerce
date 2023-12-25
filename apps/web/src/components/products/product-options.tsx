'use client';

import type { ProductVariant } from '@/api/product';
import Link from '@/components/link';
import actionsStyles from '@/components/products/product-actions-container.module.scss';
import styles from '@/components/products/product-options.module.scss';
import { Label } from '@/components/typography/label';
import type { Locale } from '@/utils/locale';
import { ConvertToLocalMeasurementSystem } from '@/utils/locale';
import { parseGid, useProduct } from '@shopify/hydrogen-react';
import { Fragment, type HTMLProps } from 'react';

export type ProductOptionProps = {
    locale: Locale;
    initialVariant: ProductVariant;
    selectedVariant: ProductVariant;
} & HTMLProps<HTMLDivElement>;
export const ProductOptions = ({
    locale,
    initialVariant,
    selectedVariant,
    style,
    className,
    ...props
}: ProductOptionProps) => {
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
    } else if (!product?.variants) {
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
        <>
            <div
                {...props}
                className={`${actionsStyles['product-options']} ${className || ''}`}
                style={{ gridArea: 'options', ...(style || {}) }}
            >
                {options?.map((option, index) =>
                    option?.values ? (
                        <Fragment key={option.name}>
                            <Label
                                className={styles.label}
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
                                    if (!value) return null;
                                    let title = value;

                                    if (option.name === 'Size' && value?.toLowerCase().endsWith('g')) {
                                        title = ConvertToLocalMeasurementSystem({
                                            locale,
                                            weight: Number.parseFloat(value!.slice(0, -1)),
                                            weightUnit: 'GRAMS'
                                        });
                                    }

                                    // FIXME: Handle options to variant properly.
                                    const matchingVariant =
                                        (value &&
                                            title &&
                                            variants
                                                ?.filter((variant) => variant)
                                                ?.find(
                                                    (variant) =>
                                                        variant!.title?.toLowerCase()?.includes(value!.toLowerCase()) ||
                                                        variant!.title?.toLowerCase()?.includes(title!.toLowerCase())
                                                )) ||
                                        undefined;
                                    let href = `/products/${handle}/`;
                                    let asComponent: any = undefined;

                                    if (matchingVariant?.id) {
                                        if (matchingVariant.id !== initialVariant.id)
                                            href = `${href}?variant=${parseGid(matchingVariant.id).id}`;
                                    }

                                    const extraProps = {
                                        locale: locale,
                                        href: href,
                                        replace: true,
                                        onClick: () =>
                                            setSelectedOptions({
                                                ...(selectedOptions as any),
                                                [option.name!]: value!
                                            })
                                    };

                                    const inStock = isOptionInStock(option.name!, value!);
                                    return (
                                        <Link
                                            key={value}
                                            as={asComponent}
                                            title={`${product?.vendor} ${product?.title} - ${
                                                title || matchingVariant?.title
                                            }`}
                                            className={`${styles.option} ${
                                                selectedOptions?.[option.name!] === value ? styles.selected : ''
                                            } ${!inStock ? styles.disabled : ''} ${
                                                asComponent !== 'div' ? styles.clickable : ''
                                            }`}
                                            {...({ disabled: !inStock } as any)}
                                            {...extraProps}
                                            suppressHydrationWarning={true}
                                        >
                                            {title}
                                        </Link>
                                    );
                                })}
                            </div>
                        </Fragment>
                    ) : (
                        <div key={option?.name || index} /> // Empty div to keep the grid layout
                    )
                )}
            </div>
        </>
    );
};
