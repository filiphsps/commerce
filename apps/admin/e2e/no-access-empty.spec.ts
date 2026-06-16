import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

import { armClerkTestingToken, E2E_FRESH_OPERATOR_EMAIL } from './support/clerk';
import { ensureClerkUser } from './support/clerk-backend';

/**
 * Verifies the no-access / empty state: a signed-in operator with NO org and NO storefront sees the
 * chooser's empty "create your first one" state and the "Create organization" call-to-action — never a
 * crash or an error surface. The chooser query treats an un-provisioned/org-less operator as "no orgs
 * yet" (returns `[]`), which the page renders as the empty state rather than throwing.
 *
 * Drives the fresh `+clerk_test` operator (no seeded org) against the REAL app, signing in within the
 * test on a clean context. Rerun-safe: the fresh user is find-or-created and the test creates nothing.
 */
test.describe('no-access / empty chooser state', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('an org-less operator sees the empty state, not a crash', async ({ page }) => {
        await ensureClerkUser(E2E_FRESH_OPERATOR_EMAIL);

        await armClerkTestingToken(page);
        await page.goto('/auth/sign-in/');
        await clerk.signIn({ page, emailAddress: E2E_FRESH_OPERATOR_EMAIL });

        await page.goto('/');

        // The chooser rendered (authenticated), not a redirect back to sign-in or an error page.
        await expect(page).not.toHaveURL(/\/auth\/sign-in/);
        await expect(page.getByRole('heading', { name: 'Choose a storefront' })).toBeVisible({ timeout: 30_000 });

        // The empty state + the create-organization CTA are present.
        await expect(page.getByText('No storefronts yet')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Create organization' })).toBeVisible();

        await clerk.signOut({ page });
    });
});
