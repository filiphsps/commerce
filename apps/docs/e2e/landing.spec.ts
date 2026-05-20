import { expect, test } from '@playwright/test';

test('landing renders and links to Getting Started', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Nordcom Commerce');
    // The Nextra sidebar also includes a hidden anchor to getting-started, so
    // scope to <main> to disambiguate the landing CTA from the sidebar entry.
    await page.locator('main a[href*="getting-started"]').first().click();
    await expect(page).toHaveURL(/getting-started/);
});
