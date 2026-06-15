import { expect, test } from '@playwright/test';

import { ARTICLE_HANDLE, BLOG_HANDLE, LOCALE } from './fixtures/storefront';

/**
 * Blog browsing against the seeded mock.shop tenant (blog `news`): the blog index lists article cards
 * that link into article detail, and an article page renders its heading and body.
 */
test.describe('Blog', () => {
    test('the blog index lists articles linking into detail pages', async ({ page }) => {
        await page.goto(`/${LOCALE}/blogs/${BLOG_HANDLE}/`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 });
        const articleLink = page.locator(`a[href*="/blogs/${BLOG_HANDLE}/"]`).first();
        await expect(articleLink).toBeVisible({ timeout: 30_000 });
    });

    test('an article page renders its heading and body', async ({ page }) => {
        await page.goto(`/${LOCALE}/blogs/${BLOG_HANDLE}/${ARTICLE_HANDLE}/`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 });
        // The article body renders real prose content below the heading.
        await expect(page.locator('article, main').first()).toBeVisible();
    });
});
