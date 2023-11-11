'use client';

import type { Locale, LocaleDictionary } from '@/utils/locale';

import { CartSummary } from '@/components/CartSummary';
import CartLines from '@/components/cart/cart-lines';
import { Checkout } from '@/utils/checkout';
import { useCart } from '@shopify/hydrogen-react';
import type { ReactNode } from 'react';
import { styled } from 'styled-components';

const Container = styled.main`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer-large);
`;

const Primary = styled.article`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    grid-template-areas: 'content' 'sidebar';
    gap: var(--block-spacer-large);
    max-width: 100%;

    @media (min-width: 950px) {
        grid-template-columns: 1fr minmax(auto, 36rem);
        grid-template-rows: 1fr;
        grid-template-areas: 'content sidebar';
    }
`;

const Content = styled.main`
    grid-area: content;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    gap: var(--block-spacer-large);
    width: 100%;
`;
const Sidebar = styled.article`
    grid-area: sidebar;
`;

type CartContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    header: ReactNode;
    slices: ReactNode;
};
export default function CartContent({ locale, i18n, header, slices }: CartContentProps) {
    const cart = useCart();
    const { status } = cart;

    return (
        <Container>
            <Primary>
                <Content>
                    {header}
                    <CartLines cart={cart} locale={locale} i18n={i18n} />
                </Content>
                <Sidebar>
                    <CartSummary
                        showLoader={['fetching', 'updating', 'creating'].includes(status)}
                        freeShipping={false}
                        onCheckout={async () => {
                            // FIXME: User-feedback here.
                            if (!['idle', 'uninitialized'].includes(status)) return;

                            try {
                                await Checkout({
                                    cart,
                                    locale: locale
                                });
                            } catch (error: any) {
                                // FIXME: Also user-feedback here.
                                console.error(error);
                                alert(error.message);
                            }
                        }}
                        i18n={i18n}
                    />
                </Sidebar>
            </Primary>

            {slices}
        </Container>
    );
}
