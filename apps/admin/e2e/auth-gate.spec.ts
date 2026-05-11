import { expect, test } from '@playwright/test';

test('direct nav to protected route without session redirects', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/settings');
    await expect(page).toHaveURL(/login|auth/);
});

test('direct nav to root without session redirects', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await expect(page).toHaveURL(/login|auth/);
});
