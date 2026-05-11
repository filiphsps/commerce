import { expect, test } from '@playwright/test';

test('home page loads via dev-host fallback', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/en-US\//);
});
