import { expect, test } from '@playwright/test';

import { LOCALE } from './fixtures/storefront';

/**
 * The customer account route against the seeded tenant. Unauthenticated (the storefront e2e context
 * carries no customer session), it must resolve without crashing and present a sign-in affordance
 * rather than account internals.
 */
test.describe('Account', () => {
    test('unauthenticated account route renders a sign-in affordance', async ({ page }) => {
        const response = await page.goto(`/${LOCALE}/account/`, { waitUntil: 'domcontentloaded' });
        expect(response?.status() ?? 200).toBeLessThan(500);
        await expect(
            page
                .getByRole('link', { name: /log ?in|sign in/i })
                .or(page.getByRole('button', { name: /log ?in|sign in/i }))
                .first(),
        ).toBeVisible({ timeout: 30_000 });
    });
});
