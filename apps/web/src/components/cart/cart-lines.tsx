'use client';

import '@/styles/currency.scss';

import { CartLineProvider, useCart } from '@shopify/hydrogen-react';

import CartItem from '@/components/CartItem';
import PageLoader from '@/components/PageLoader';
import { Label } from '@/components/typography/label';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { Suspense } from 'react';
import { styled } from 'styled-components';

const Container = styled.table`
    display: block;
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 1rem;
    font-size: 1.25rem;
    table-layout: fixed;

    tbody,
    thead {
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: var(--block-spacer);
        width: 100%;
        max-width: 100%;
    }

    @media (min-width: 1418px) {
        border-spacing: 0;
        table-layout: auto;
        border-collapse: collapse;

        tbody {
            max-width: 100%;

            display: grid;
            grid-template-columns: calc(50% - 0.5rem) calc(50% - 0.5rem);
            gap: var(--block-spacer);
        }
    }
`;

const NoItems = styled.div`
    display: flex;
    flex-shrink: 1;
    font-size: 1.25rem;
    color: var(--color-dark-secondary);

    & > div {
        padding: var(--block-padding) var(--block-padding-large);
        background: var(--color-block);
        border-radius: var(--block-border-radius);
        border: var(--block-border-width) solid var(--color-block-dark);
    }
`;

type CartContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
export default function CartLines({ locale, i18n }: CartContentProps) {
    const { status, lines } = useCart();
    if (!['idle', 'uninitialized'].includes(status)) return <PageLoader />;

    if (!lines || lines.length <= 0)
        return (
            <NoItems>
                <div>
                    <Label>There are no items in your cart.</Label>
                </div>
            </NoItems>
        );

    return (
        <Container>
            <tbody>
                <Suspense
                    fallback={
                        <>
                            <CartItem locale={locale} i18n={i18n} />
                        </>
                    }
                >
                    {lines?.map((item) => {
                        if (!item) return null;

                        return (
                            <CartLineProvider key={item.id} line={item}>
                                <CartItem locale={locale} i18n={i18n} />
                            </CartLineProvider>
                        );
                    })}
                </Suspense>
            </tbody>
        </Container>
    );
}
