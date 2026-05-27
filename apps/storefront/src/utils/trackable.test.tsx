import { describe, expect, it, vi } from 'vitest';

import { render } from '@/utils/test/react';
import { Trackable } from '@/utils/trackable';

vi.mock('@shopify/hydrogen-react', async () => {
    return {
        useShop: vi.fn().mockReturnValue({}),
        useShopifyCookies: vi.fn().mockReturnValue({}),
    };
});

// Analytics is opt-in: Trackable must mount in routes that don't have
// a CartProvider in scope. `useMaybeCart()` returns null in that case —
// mirror that here so the suite exercises the null path.
vi.mock('@nordcom/cart-react', () => ({
    useMaybeCart: vi.fn().mockReturnValue(null),
}));

describe('components', () => {
    describe('Trackable', () => {
        it('should render children', () => {
            render(
                <Trackable>
                    <div>Test Content</div>
                </Trackable>,
            );

            expect(document.querySelector('div')).not.toBeNull();
            expect(document.querySelector('div')?.textContent).toBe('Test Content');
        });

        it('renders children when no cart provider is in scope', () => {
            // `useMaybeCart` is mocked to return null above — verify Trackable
            // doesn't crash the tree when analytics has no cart context.
            render(
                <Trackable>
                    <div>No Cart Provider</div>
                </Trackable>,
            );

            expect(document.querySelector('div')?.textContent).toBe('No Cart Provider');
        });
    });
});
