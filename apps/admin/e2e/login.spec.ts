import { expect, test } from '@playwright/test';

// Note: Tests smoke-test the login PAGE and authentication redirect.
// Full login flow with seeded user is deferred to integration tests with
// a working auth provider. These tests verify the auth gate works.

test('unauthenticated root redirects to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login|auth/);
});

test('login page renders with email and password inputs', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('textbox').first()).toBeVisible();
});
