import '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { Locale } from '@/utils/locale';
import { Trackable } from '@/utils/trackable';
import { queries, render, within } from '@testing-library/react';

import { ShopProvider } from '@/components/shop/provider';

import type { ReactElement, ReactNode } from 'react';

const Providers = ({ children }: { children: ReactNode }) => {
    const shop = {
        domain: 'example.com'
    } as any;
    const newShop = {
        domain: 'example.com',
        integrations: {}
    } as any;

    return (
        <ShopProvider shop={shop} newShop={newShop} locale={Locale.default} currency={'USD'}>
            <Trackable>{children}</Trackable>
        </ShopProvider>
    );
};

const customScreen = within(document.body, queries);
const customWithin = (element: ReactElement) => within(element as any, queries);
const customRender = (ui: Parameters<typeof render>[0], options?: Omit<Parameters<typeof render>[1], 'queries'>) =>
    render(ui, { wrapper: Providers, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render, customScreen as screen, customWithin as within };
