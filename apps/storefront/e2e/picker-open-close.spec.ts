import { expect, test } from '@playwright/test';

import { gotoCollectionWithProducts } from './fixtures/storefront';

/**
 * The product card variant picker against the seeded mock.shop tenant: a multi-variant card exposes a
 * "Choose options" CTA that opens the picker overlay, which closes on Escape. The canonical collection
 * may be entirely single-buyable (direct add-to-bag), so the interaction is asserted only when a
 * picker-bearing card is present.
 */
test.describe('Product card picker', () => {
    test('the picker opens via Choose options and closes via Escape', async ({ page }) => {
        await gotoCollectionWithProducts(page);
        const chooseOptions = page.getByRole('button', { name: /choose options/i }).first();
        if (!(await chooseOptions.isVisible({ timeout: 5_000 }).catch(() => false))) {
            test.skip(true, 'no multi-variant (Choose options) card in the canonical collection');
        }
        await chooseOptions.click();
        const overlay = page.getByRole('dialog').or(page.locator('[data-state="open"]')).first();
        await expect(overlay).toBeVisible({ timeout: 3_000 });
        await page.keyboard.press('Escape');
        await expect(overlay).toBeHidden({ timeout: 3_000 });
    });
});
