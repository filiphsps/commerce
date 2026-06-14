import { describe, expect, it, vi } from 'vitest';

// ShopifyConnectForm transitively imports `./shopify/actions` (a `'use server'` module) and the
// `@nordcom/nordstar` barrel, whose `.css` side-imports the test runner can't load. Stub both so the
// real form module resolves; this suite only asserts the registry wiring, never renders the form.
vi.mock('./shopify/actions', () => ({ testShopifyConnection: vi.fn() }));
vi.mock('@nordcom/nordstar', () => ({
    Button: ({ children, onClick, disabled, ...p }: any) => (
        <button onClick={onClick} disabled={disabled} {...p}>
            {children}
        </button>
    ),
    Input: ({ label, value, onChange, ...p }: any) => (
        <input aria-label={label} value={value} onChange={onChange} {...p} />
    ),
    Label: ({ children }: any) => <span>{children}</span>,
    Details: ({ children }: any) => <details open>{children}</details>,
}));

import { COMMERCE_PROVIDERS, PROVIDER_ORDER } from './registry';
import { ShopifyConnectForm } from './shopify/connect-form';

describe('commerce-provider UI registry', () => {
    it('registers Shopify with the real connect form and label', () => {
        expect(COMMERCE_PROVIDERS.shopify?.label).toBe('Shopify');
        expect(COMMERCE_PROVIDERS.shopify?.id).toBe('shopify');
        expect(COMMERCE_PROVIDERS.shopify?.ConnectForm).toBe(ShopifyConnectForm);
    });

    it('orders Shopify into the picker', () => {
        expect(PROVIDER_ORDER).toContain('shopify');
        // Every ordered id must have a registry entry (no dangling picker buttons).
        for (const id of PROVIDER_ORDER) {
            expect(COMMERCE_PROVIDERS[id]).toBeDefined();
        }
    });
});
