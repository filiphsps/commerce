import { expect, test } from '@playwright/test';

test('admin redirects unauthenticated users to login', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/login|auth/i);
});
