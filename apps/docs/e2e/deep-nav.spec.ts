import { expect, test } from '@playwright/test';

test('deep navigation to a workspace subpath page', async ({ page }) => {
    // The CMS package mirrors its content under cms/overview — there is no
    // standalone cms/page.mdx, so target a route that actually exists.
    await page.goto('/docs/cms/overview/');
    await expect(page.locator('h1')).toBeVisible();
    // Breadcrumb shows expected segments
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toContainText('cms');
    await expect(breadcrumb).toContainText('overview');
});
