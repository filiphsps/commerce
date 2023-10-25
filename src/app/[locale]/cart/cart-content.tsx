'use client';

import CartLines from '@/components/cart/cart-lines';
import { CartSummary } from '@/components/CartSummary';
import { Checkout } from '@/utils/checkout';
import { Config } from '@/utils/Config';
import type { LocaleDictionary } from '@/utils/Locale';
import { NextLocaleToLocale } from '@/utils/Locale';
import type { ReactNode } from 'react';
import type { StoreModel } from '@/models/StoreModel';
import { styled } from 'styled-components';
import { useCart } from '@shopify/hydrogen-react';
import { usePathname } from 'next/navigation';

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
    slices: ReactNode;
    i18n: LocaleDictionary;
};
export default function CartContent({ slices, i18n }: CartContentProps) {
    const cart = useCart();
    const route = usePathname();
    const locale = NextLocaleToLocale(route?.split('/').at(1) || Config.i18n.default); // FIXME: Handle this properly.

    return (
        <Container>
            <Primary>
                <Content>
                    <CartLines cart={cart} />
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
