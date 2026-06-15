import { expect, test } from '@playwright/test';

import { gotoCollectionWithProducts } from './fixtures/storefront';

/**
 * The product card's swatch image swap against the seeded mock.shop tenant: hovering/activating a
 * swatch swaps the card's primary image without navigating away from the collection.
 */
test.describe('Product card swatch swap', () => {
    test('activating a swatch swaps the image without navigating', async ({ page }) => {
        await gotoCollectionWithProducts(page);
        const card = page
            .getByTestId('product-card-root')
            .filter({ has: page.getByTestId('product-card-image-swap') })
            .first();
        await expect(card).toBeVisible({ timeout: 30_000 });

        const img = card.locator('img').first();
        await expect(img).toBeVisible();
        const before = await img.getAttribute('src');
        const url = page.url();

        const swatches = card.getByTestId('product-card-image-swap');
        if ((await swatches.count()) < 2) {
            test.skip(true, 'first swatch-bearing card exposes fewer than two swatches');
        }
        await swatches.nth(1).hover();
        await swatches.nth(1).click();
        await expect(async () => {
            expect(await img.getAttribute('src')).not.toBe(before);
        }).toPass({ timeout: 5_000 });
        expect(page.url()).toBe(url);
    });
});
