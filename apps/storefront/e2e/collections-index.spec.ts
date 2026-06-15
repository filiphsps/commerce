import { expect, test } from '@playwright/test';

import { LOCALE } from './fixtures/storefront';

/**
 * The new `/collections` index route. Previously a bare `/collections` request 404'd; it must now
 * resolve, list the seeded tenant's collections as tiles, and link each to its collection page.
 */
test.describe('Collections index', () => {
    test('lists collections and links through to a collection page', async ({ page }) => {
        const response = await page.goto(`/${LOCALE}/collections/`, { waitUntil: 'domcontentloaded' });
        expect(response?.status() ?? 200).toBeLessThan(500);

        await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });

        const tile = page.getByTestId('collection-card').first();
        await expect(tile).toBeVisible({ timeout: 30_000 });

        await tile.click();
        await expect(page).toHaveURL(/\/collections\/[^/]+\/?(\?.*)?$/, { timeout: 30_000 });
        // The destination is a real collection page, not the index it came from.
        await expect(page).not.toHaveURL(/\/collections\/?$/);
    });
});
