import { expect, test } from '@playwright/test';

import { gotoCollectionWithProducts } from './fixtures/storefront';

/**
 * The product card surface against the seeded mock.shop tenant (sourced from a collection — the
 * reliable product surface): the grid renders, each card carries its layout/chrome contract and a
 * quick-add CTA, and interactive controls meet the minimum touch-target size.
 */
test.describe('Product card', () => {
    test('the collection grid renders product cards', async ({ page }) => {
        await gotoCollectionWithProducts(page);
        expect(await page.getByTestId('product-card-root').count()).toBeGreaterThan(1);
    });

    test('a card carries layout + chrome data attrs', async ({ page }) => {
        const card = await gotoCollectionWithProducts(page);
        await expect(card).toHaveAttribute('data-layout', /vertical|horizontal/);
        await expect(card).toHaveAttribute('data-chrome', /boxed|frameless/);
    });

    test('a card exposes a quick-add CTA', async ({ page }) => {
        const card = await gotoCollectionWithProducts(page);
        await expect(card.getByRole('button', { name: /add to bag|choose options/i }).first()).toBeVisible();
    });

    test('interactive controls meet the 24px minimum touch target', async ({ page }) => {
        const card = await gotoCollectionWithProducts(page);
        const buttons = card.getByRole('button');
        const count = Math.min(await buttons.count(), 20);
        const undersized: string[] = [];
        for (let i = 0; i < count; i++) {
            const button = buttons.nth(i);
            if (!(await button.isVisible().catch(() => false))) continue;
            const box = await button.boundingBox();
            if (box && Math.min(box.width, box.height) < 24) {
                undersized.push(`${(await button.textContent())?.trim().slice(0, 20)} (${box.width}x${box.height})`);
            }
        }
        expect(undersized).toEqual([]);
    });
});
