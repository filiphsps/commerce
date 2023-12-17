'use client';

import type { ProductVariant } from '@/api/product';
import Link from '@/components/link';
import styles from '@/components/products/product-actions-container.module.scss';
import { Label } from '@/components/typography/label';
import type { Locale } from '@/utils/locale';
import { ConvertToLocalMeasurementSystem } from '@/utils/locale';
import { parseGid, useProduct } from '@shopify/hydrogen-react';
import { Fragment, type HTMLProps } from 'react';
import styled from 'styled-components';

const OptionValues = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: var(--block-spacer-small);
    padding-bottom: var(--block-spacer-small);
`;

const OptionValue = styled(Link)`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-small);
    justify-content: center;
    align-items: center;
    min-height: 5rem;
    padding: var(--block-padding-small) var(--block-padding);
    border: var(--block-border-width) solid var(--color-block);
    border-radius: var(--block-border-radius);
    color: var(--color-dark);
    text-align: center;
    font-size: 1.5rem;
    font-weight: 700;
    transition: 150ms ease-in-out;
    user-select: none;

    &.clickable {
        cursor: pointer;
    }

    &:is(:active, :focus, :focus-within, :hover:not(.selected)):not(:disabled) {
        border-color: var(--color-block-dark);
    }

    &.selected {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
        font-weight: 700;
    }

    &.disabled,
    &:disabled {
        opacity: 0.5;
        pointer-events: none;

        background-color: var(--color-block);
        color: var(--color-dark);

        @media (hover: hover) and (pointer: fine) {
            &:hover {
                color: inherit;
                background: inherit;
            }
        }
    }
`;

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
                className={`${styles.productOptions} ${className || ''}`}
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
                            <OptionValues data-options={option.values.length} suppressHydrationWarning={true}>
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
                                    let asComponent: any = Link;

                                    if (matchingVariant?.id) {
                                        if (matchingVariant.id !== initialVariant.id)
                                            href = `${href}?variant=${parseGid(matchingVariant.id).id}`;

                                        if (selectedVariant && selectedVariant.id === matchingVariant.id)
                                            asComponent = 'div';
                                    }

                                    const extraProps =
                                        (asComponent !== 'div' && {
                                            locale: locale,
                                            href: href,
                                            replace: true,
                                            onClick: () =>
                                                setSelectedOptions({
                                                    ...(selectedOptions as any),
                                                    [option.name!]: value!
                                                })
                                        }) ||
                                        {};

                                    const inStock = isOptionInStock(option.name!, value!);
                                    return (
                                        <OptionValue
                                            key={value}
                                            as={asComponent}
                                            title={`${product?.vendor} ${product?.title} - ${
                                                title || matchingVariant?.title
                                            }`}
                                            className={`${
                                                (selectedOptions?.[option.name!] === value && 'selected') || ''
                                            } ${(!inStock && 'disabled') || ''} ${
                                                (asComponent !== 'div' && 'clickable') || ''
                                            }`}
                                            disabled={!inStock}
                                            {...extraProps}
                                            suppressHydrationWarning={true}
                                        >
                                            {title}
                                        </OptionValue>
                                    );
                                })}
                            </OptionValues>
                        </Fragment>
                    ) : (
                        <div key={option?.name || index} /> // Empty div to keep the grid layout
                    )
                )}
            </div>
        </>
    );
};
