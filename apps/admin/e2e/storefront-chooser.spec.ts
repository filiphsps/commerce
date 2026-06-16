import { expect, test } from '@playwright/test';

import { armClerkTestingToken, E2E_SHOP_DOMAIN } from './support/clerk';

/**
 * Verifies the bespoke org×storefront chooser for the seeded operator: it lists the operator's org
 * group and a storefront card for the canonical seeded shop, and clicking the card routes into that
 * shop's `/[domain]/` workspace. Runs against the REAL app with the harness's authenticated storage
 * state; the seeded org owns the canonical `E2E_SHOP_DOMAIN` shop (a REAL seeded handle).
 *
 * Rerun-safe: read-only navigation, mutates no state.
 */
test.describe('storefront chooser', () => {
    test('lists the operator org with the seeded storefront card', async ({ page }) => {
        await armClerkTestingToken(page);
        await page.goto('/');

        await expect(page.getByRole('heading', { name: 'Choose a storefront' })).toBeVisible({ timeout: 30_000 });

        // The seeded org group renders a card linking to the canonical shop's `/[domain]/` workspace.
        const card = page.getByRole('link', { name: new RegExp(E2E_SHOP_DOMAIN.replace(/\./g, '\\.')) });
        await expect(card.first()).toBeVisible();
    });

    test('clicking a storefront card routes to its /[domain]/ workspace', async ({ page }) => {
        await armClerkTestingToken(page);
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Choose a storefront' })).toBeVisible({ timeout: 30_000 });

        const card = page.getByRole('link', { name: new RegExp(E2E_SHOP_DOMAIN.replace(/\./g, '\\.')) }).first();
        await card.click();

        await expect(page).toHaveURL(new RegExp(`/${E2E_SHOP_DOMAIN.replace(/\./g, '\\.')}/`), { timeout: 30_000 });
    });
});
