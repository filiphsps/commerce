import { expect, test } from '@playwright/test';

test('search results page renders for a non-empty query', async ({ page }) => {
    await page.goto('/en-US/search/?q=test');
    await expect(page).toHaveURL(/q=test/);
});

test('search handles empty query gracefully', async ({ page }) => {
    const res = await page.goto('/en-US/search/');
    expect(res?.status()).toBeLessThan(500);
});
