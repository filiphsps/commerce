import '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { OnlineShop } from '@nordcom/commerce-db';
import { queries, render, within } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { ShopProvider } from '@/components/shop/provider';
import { Locale } from '@/utils/locale';
import { Trackable } from '@/utils/trackable';

/**
 * Wraps test-rendered components with the minimum provider tree required by the storefront application (shop context + analytics).
 *
 * @param props.children - The component tree to wrap.
 * @returns The wrapped subtree inside `ShopProvider` and `Trackable`.
 */
const Providers = ({ children }: { children: ReactNode }) => {
    const shop = {
        id: 'mock-shop-id',
        domain: 'staging.storefront.localhost',
        commerceProvider: {
            type: 'shopify' as const,
            domain: 'mock.shop' as const,
        },
    } as unknown as OnlineShop;

    return (
        <ShopProvider shop={shop} locale={Locale.default} currency={'USD'}>
            <Trackable>{children}</Trackable>
        </ShopProvider>
    );
};

const customScreen = within(document.body, queries);
/**
 * Wraps Testing Library's `within` to scope queries to a specific React element, using the custom query set.
 *
 * @param element - The React element to scope queries to.
 * @returns A Testing Library `within` scope bound to `element`.
 */
const customWithin = (element: ReactElement) => within(element as unknown as HTMLElement, queries);
/**
 * Renders a React element inside the storefront provider tree and returns Testing Library query utilities.
 *
 * @param ui - The element to render.
 * @param options - Optional Testing Library render options (excluding `queries`).
 * @returns The Testing Library render result with the wrapped provider tree.
 */
const customRender = (ui: Parameters<typeof render>[0], options?: Omit<Parameters<typeof render>[1], 'queries'>) =>
    render(ui, { wrapper: Providers, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render, customScreen as screen, customWithin as within };
