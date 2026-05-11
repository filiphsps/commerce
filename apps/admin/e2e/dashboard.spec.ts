import { expect, test } from '@playwright/test';

// Note: Tests smoke-test the auth gate on the dashboard route.
// Full dashboard interaction is deferred to integration tests with a
// properly authenticated session. These tests verify the auth redirect works.

test('dashboard requires authentication', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login|auth/);
});
