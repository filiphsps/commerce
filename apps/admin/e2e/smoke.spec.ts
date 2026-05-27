import { expect, test } from '@playwright/test';

// Opt out of the storageState fixture so we exercise the un-authed redirect.
test.use({ storageState: { cookies: [], origins: [] } });

test.skip('admin redirects unauthenticated users to login', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/login|auth/i);
});
