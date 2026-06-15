import { expect, test } from '@playwright/test';

import { gotoCollectionWithProducts } from './fixtures/storefront';

/**
 * Single-buyable fast path: a product with a single purchasable variant exposes a direct "Add to bag"
 * quick-add on its collection card (rather than a "Choose options" picker), so the shopper can add
 * without opening the variant UI.
 */
test.describe('Product card single-buyable fast-path', () => {
    test('a single-buyable card shows a direct add-to-bag CTA', async ({ page }) => {
        await gotoCollectionWithProducts(page);
        const fastPathCta = page
            .getByTestId('product-card-root')
            .first()
            .getByRole('button', { name: /add to bag/i });
        await expect(fastPathCta.first()).toBeVisible({ timeout: 30_000 });
    });
});
