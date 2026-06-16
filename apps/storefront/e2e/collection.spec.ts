import { expect, test } from '@playwright/test';

import { collectionPath, gotoCollectionWithProducts, LOCALE } from './fixtures/storefront';

/**
 * Collection browsing against the seeded mock.shop tenant: the product grid renders real products,
 * each card carries its layout/chrome contract and a quick-add CTA, a card links to its PDP, and an
 * unknown collection handle resolves to the not-found surface rather than crashing.
 */
test.describe('Collection page', () => {
    test('renders a product grid of real mock.shop products', async ({ page }) => {
        await gotoCollectionWithProducts(page);
        const cards = page.getByTestId('product-card-root');
        expect(await cards.count()).toBeGreaterThan(1);
    });

    test('each card carries layout + chrome data attrs and a quick-add CTA', async ({ page }) => {
        const card = await gotoCollectionWithProducts(page);
        await expect(card).toHaveAttribute('data-layout', /vertical|horizontal/);
        await expect(card).toHaveAttribute('data-chrome', /boxed|frameless/);
        await expect(card.getByRole('button', { name: /add to bag|choose options/i }).first()).toBeVisible();
    });

    test('a card links through to its product detail page', async ({ page }) => {
        const card = await gotoCollectionWithProducts(page);
        const href = await card.locator('a[href*="/products/"]').first().getAttribute('href');
        expect(href).toMatch(new RegExp(`/${LOCALE}/products/.+/`));

        await card.locator('a[href*="/products/"]').first().click();
        await expect(page).toHaveURL(new RegExp(`/${LOCALE}/products/.+/`));
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 });
    });

    test('renders the shared faceted filter toolbar', async ({ page }) => {
        // Collections adopt the same `ProductFilters` toolbar as /products and search, fed by Shopify's
        // native `collection.products(filters:)` facets. The sort control mounting proves the toolbar
        // rendered above the grid.
        await gotoCollectionWithProducts(page);
        await expect(page.locator('select[aria-label="Sort"]')).toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId('product-card-root').first()).toBeVisible({ timeout: 30_000 });
    });

    test('keeps a sorting selection in the URL on a collection', async ({ page }) => {
        await gotoCollectionWithProducts(page);
        const sort = page.locator('select[aria-label="Sort"]');
        await expect(sort).toBeVisible({ timeout: 30_000 });
        await sort.selectOption('PRICE');
        await expect(page).toHaveURL(/sorting=PRICE/);
        // The grid re-fetches under the new sort; a card proves the filtered query resolved.
        await expect(page.getByTestId('product-card-root').first()).toBeVisible({ timeout: 30_000 });
    });

    test('an unknown collection handle resolves to the not-found surface', async ({ page }) => {
        await page.goto(collectionPath('this-collection-does-not-exist-xyz'), { waitUntil: 'domcontentloaded' });
        // No product grid for a missing collection; the not-found UI takes over.
        await expect(page.getByTestId('product-card-root')).toHaveCount(0);
        await expect(page.getByText(/not found|doesn't exist|does not exist/i).first()).toBeVisible({
            timeout: 15_000,
        });
    });
});
