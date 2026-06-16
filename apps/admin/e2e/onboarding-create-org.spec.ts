import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

import { armClerkTestingToken, E2E_FRESH_OPERATOR_EMAIL } from './support/clerk';
import { ensureClerkUser } from './support/clerk-backend';

/**
 * Verifies the self-serve create-organization onboarding step. A FRESH `+clerk_test` operator (a
 * second reserved email, distinct from the primary seeded operator so this never disturbs that
 * tenant's seeded org) signs in and is taken to the themed `<CreateOrganization/>` surface, asserted
 * through the route rendering Clerk's create-organization form inside the AuthShell.
 *
 * Opts OUT of the shared operator storage state and signs the fresh user in within the test, so the
 * onboarding state (no org) is exercised against the REAL app. Rerun-safe: the fresh Clerk user is
 * find-or-created (never duplicated) and the test creates no org.
 */
test.describe('create-organization onboarding', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('a fresh operator reaches the themed CreateOrganization step', async ({ page }) => {
        // Ensure the fresh test identity exists in Clerk, then sign it in for THIS context only.
        await ensureClerkUser(E2E_FRESH_OPERATOR_EMAIL);

        await armClerkTestingToken(page);
        await page.goto('/auth/sign-in/');
        await clerk.signIn({ page, emailAddress: E2E_FRESH_OPERATOR_EMAIL });

        await page.goto('/onboarding/');

        // AuthShell chrome around Clerk's <CreateOrganization/>: the "Create your organization" heading.
        await expect(page.getByRole('heading', { name: 'Create your organization' })).toBeVisible({ timeout: 30_000 });

        // Clerk's create-organization form mounted (the org-name field is its hallmark control).
        await expect(page.locator('input[name="name"]').first()).toBeVisible({ timeout: 30_000 });

        await clerk.signOut({ page });
    });
});
