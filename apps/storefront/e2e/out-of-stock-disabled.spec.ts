import { expect, test } from '@playwright/test';

import { gotoCollectionWithProducts } from './fixtures/storefront';

/**
 * Out-of-stock rendering against the seeded mock.shop tenant: a sold-out product card surfaces an
 * out-of-stock affordance instead of an enabled add-to-bag. mock.shop stock varies, so the assertion
 * runs only when the canonical collection currently has a sold-out card.
 */
test.describe('Product card out-of-stock state', () => {
    test('a sold-out card disables its add CTA', async ({ page }) => {
        await gotoCollectionWithProducts(page);
        const oos = page
            .getByTestId('product-card-root')
            .filter({ hasText: /out of stock|sold out/i })
            .first();
        if (!(await oos.isVisible({ timeout: 5_000 }).catch(() => false))) {
            test.skip(true, 'no out-of-stock products in the canonical collection right now');
        }
        const addCta = oos.getByRole('button', { name: /add to bag|add to cart/i });
        if ((await addCta.count()) > 0) {
            await expect(addCta.first()).toBeDisabled();
        }
    });
});
