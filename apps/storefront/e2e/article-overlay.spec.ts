import { expect, test } from '@playwright/test';
import { seedCms } from './fixtures/seed-cms';

const TENANT_ID = process.env.E2E_TENANT_ID ?? 'staging-tenant';

test.describe('Article overlay (CMS over Shopify)', () => {
    test.beforeAll(async () => {
        await seedCms({ tenantId: TENANT_ID });
    });

    // This test assumes the test shop already has a Shopify article seeded with
    // slug `launch` (matching the CMS Article slug in seed-cms.ts). Adapt the
    // URL if the staging shop uses a different blog handle.
    const ARTICLE_URL = '/en-US/blogs/news/launch/';

    test('CMS overrides the article title in metadata', async ({ page }) => {
        const response = await page.goto(ARTICLE_URL);
        if (!response || response.status() >= 400) test.skip(true, 'Shopify article missing — overlay cannot run');
        await expect(page).toHaveTitle(/Launch — Overlay SEO/);
    });

    test('CMS body renders below Shopify body', async ({ page }) => {
        await page.goto(ARTICLE_URL);
        await expect(page.getByText('CMS-driven body')).toBeVisible();
    });
});
