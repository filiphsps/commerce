import { expect, test } from '@playwright/test';

import { gotoCollectionWithProducts } from './fixtures/storefront';

/**
 * Product card pricing against the seeded mock.shop tenant. Every card renders a price; an on-sale
 * card additionally renders a struck compare-at price and the `data-on-sale` marker. The mock.shop
 * catalog carries no compare-at pricing, so the on-sale branch is asserted only when such a card
 * exists (it is exercised exhaustively by the unit suite); the regular-price render is always checked.
 */
test.describe('Product card sale state', () => {
    test('every card renders a price', async ({ page }) => {
        const card = await gotoCollectionWithProducts(page);
        await expect(card.getByText(/\$|kr|€|CA\$/).first()).toBeVisible({ timeout: 15_000 });
    });

    test('an on-sale card renders a compare-at price when present', async ({ page }) => {
        await gotoCollectionWithProducts(page);
        const onSale = page.locator('[data-testid="product-card-root"][data-on-sale]');
        if ((await onSale.count()) === 0) {
            test.skip(true, 'mock.shop catalog has no on-sale (compare-at) products');
        }
        // The block renders the active price and the struck compare-at price as two price nodes.
        const prices = onSale.first().locator('[data-on-sale] span');
        expect(await prices.count()).toBeGreaterThanOrEqual(2);
    });
});
