// apps/docs/e2e/landing.spec.ts
import { expect, test } from '@playwright/test';

test('landing renders and links to Getting Started', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Nordcom Commerce');
    await page.click('a[href*="getting-started"]');
    await expect(page).toHaveURL(/getting-started/);
});
