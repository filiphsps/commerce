'use client';

import { CartSummary } from '@/components/CartSummary';
import CartLines from '@/components/cart/cart-lines';
import type { StoreModel } from '@/models/StoreModel';
import { Checkout } from '@/utils/checkout';
import type { Locale, LocaleDictionary } from '@/utils/locale';
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
    store?: StoreModel;
    locale: Locale;
    slices: ReactNode;
    i18n: LocaleDictionary;
};
export default function CartContent({ locale, slices, i18n }: CartContentProps) {
    const cart = useCart();

    return (
        <Container>
            <Primary>
                <Content>
                    <CartLines cart={cart} locale={locale} />
                </Content>
                <Sidebar>
                    <CartSummary
                        showLoader={false}
                        freeShipping={false}
                        onCheckout={async () => {
                            // FIXME: User-feedback here.
                            if (cart.status !== 'idle' && cart.status !== 'uninitialized') return;

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
