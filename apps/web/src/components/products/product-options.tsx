'use client';

import { ConvertToLocalMeasurementSystem } from '@/api/shopify/product';
import Link from '@/components/link';
import styles from '@/components/products/product-actions-container.module.scss';
import type { Locale } from '@/utils/locale';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import { parseGid, useProduct } from '@shopify/hydrogen-react';
import type { ProductVariant } from '@shopify/hydrogen-react/storefront-api-types';
import type { HTMLProps } from 'react';
import styled from 'styled-components';

const OptionValues = styled.div`
    display: grid;
    grid-auto-flow: column;
    grid-template-columns: repeat(auto-fit, minmax(6rem, min-content));
    grid-auto-rows: 1fr;
    gap: var(--block-spacer-small);
    height: 100%;
`;

const OptionValue = styled(Link)`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-small);
    justify-content: center;
    align-items: center;
    border: var(--block-border-width) solid var(--color-block);
    border-radius: var(--block-border-radius);
    color: var(--color-dark);
    text-align: center;
    font-size: 1.5rem;
    font-weight: 600;
    transition: 150ms ease-in-out;
    user-select: none;

    &.clickable {
        cursor: pointer;
    }

    &:is(:active, :focus, :focus-within, :hover:not(.selected)) {
        border-color: var(--color-block-dark);
    }

    &.selected {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
        font-weight: 800;
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
export const ProductOptions = (props: ProductOptionProps) => {
    const { locale, initialVariant, selectedVariant } = props;
    const { options, variants, selectedOptions, setSelectedOptions, isOptionInStock, product } = useProduct();

    if (!product) {
        console.error('No product found. Have you wrapped your component in a `<ProductProvider>`?');
        return null;
    }
    const { handle } = product;

    return (
        <>
            <div style={{ gridArea: 'option-labels' }}>
                {options?.map((option, index) =>
                    option?.values ? (
                        <label key={option.name} className={styles.label}>
                            {option.name}
                        </label>
                    ) : (
                        <div key={option?.name || index} /> // Empty div to keep the grid layout.
                    )
                )}
            </div>
            <div {...RemoveInvalidProps(props)}>
                {options?.map((option, index) =>
                    option?.values ? (
                        <OptionValues key={option.name}>
                            {option.values.map((value) => {
                                let title = value;

                                // Handle variants that should have their weight as their actual title
                                // FIXME: Remove `Size` when we've migrated to using Weight.
                                // FIXME: Remove incorrectly translated ones, eg  "Größe" & "Storlek".
                                if (['Size', 'Weight', 'Größe', 'Storlek'].includes(option.name!)) {
                                    title = ConvertToLocalMeasurementSystem({
                                        locale,
                                        weight: Number.parseFloat(value!.slice(0, -1)),
                                        weightUnit: 'GRAMS'
                                    });
                                }

                                // FIXME: Handle options to variant properly.
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

                                if (matchingVariant) {
                                    if (matchingVariant.id !== initialVariant.id)
                                        href = `${href}?variant=${parseGid(matchingVariant?.id).id}`;

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

                                return (
                                    <OptionValue
                                        key={value}
                                        as={asComponent}
                                        title={`${product?.vendor} ${product?.title} - ${
                                            title || matchingVariant?.title
                                        }`}
                                        className={`${
                                            (selectedOptions?.[option.name!] === value && 'selected') || ''
                                        } ${(!isOptionInStock(option.name!, value!) && 'disabled') || ''} ${
                                            (asComponent !== 'div' && 'clickable') || ''
                                        }`}
                                        {...extraProps}
                                    >
                                        {title}
                                    </OptionValue>
                                );
                            })}
                        </OptionValues>
                    ) : (
                        <div key={option?.name || index} /> // Empty div to keep the grid layout
                    )
                )}
            </div>
        </>
    );
};
