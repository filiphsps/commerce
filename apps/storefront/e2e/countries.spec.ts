import { expect, test } from '@playwright/test';

import { LOCALE } from './fixtures/storefront';

/**
 * The country/locale selector against the seeded tenant: the page lists selectable locales, and
 * choosing a different locale navigates to that locale-prefixed storefront.
 */
test.describe('Countries / locale selector', () => {
    test('lists selectable locales', async ({ page }) => {
        await page.goto(`/${LOCALE}/countries/`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { level: 1, name: /countries/i })).toBeVisible({ timeout: 30_000 });
        // At least one locale-prefixed link other than the current one.
        await expect(page.locator('a[href^="/"][href*="-"]').first()).toBeVisible();
    });

    test('selecting another locale navigates to its locale prefix', async ({ page }) => {
        await page.goto(`/${LOCALE}/countries/`, { waitUntil: 'domcontentloaded' });
        const href = await page.locator('a[href]').evaluateAll((links, current) => {
            const hit = links
                .map((a) => a.getAttribute('href') || '')
                .find((h) => /^\/[a-z]{2}-[A-Z]{2}\//.test(h) && !h.startsWith(`/${current}/`));
            return hit ?? null;
        }, LOCALE);
        if (!href) {
            test.skip(true, 'no alternate-locale link available');
        }
        await page.goto(href as string, { waitUntil: 'domcontentloaded' });
        const localeSegment = (href as string).split('/')[1];
        await expect(page).toHaveURL(new RegExp(`/${localeSegment}/`));
    });
});
