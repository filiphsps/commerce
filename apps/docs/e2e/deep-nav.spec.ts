// apps/docs/e2e/deep-nav.spec.ts
import { expect, test } from '@playwright/test';

test('deep navigation to a workspace subpath page', async ({ page }) => {
    await page.goto('/docs/cms/');
    await expect(page.locator('h1')).toBeVisible();
    // Breadcrumb shows expected segments
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toContainText('cms');
});
