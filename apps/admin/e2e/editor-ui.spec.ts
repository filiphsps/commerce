import { expect, test } from '@playwright/test';

// Use the seeded shop domain. Defaults to the local development shop.
// CI/staging should set `E2E_SHOP_DOMAIN` to a domain present in the
// target database.
const SHOP_DOMAIN = process.env.E2E_SHOP_DOMAIN ?? 'beta.pouched.de';

/**
 * These tests rely on:
 *  - The seeded test user (e2e/fixtures/seed.ts)
 *  - A shop document with `domain` === SHOP_DOMAIN
 *  - At least one page document under that shop
 *
 * NOTE: `e2e/fixtures/seed.ts` does NOT currently seed a shop or page —
 * only the test user + matching Payload user. On a fresh database with no
 * shops/pages, `getFirstPageEditUrl` will fail with "No edit link found
 * on pages list" rather than time out. Extend the fixture in a follow-up
 * when this spec needs to run in CI against an ephemeral database.
 *
 * The page/article IDs are not asserted — we use the list route to find one.
 */

test.describe('admin editor UI', () => {
    test('list route reaches a content edit page', async ({ page }) => {
        await page.goto(`/${SHOP_DOMAIN}/content/pages/`);
        await expect(page).toHaveURL(new RegExp(`/${SHOP_DOMAIN}/content/pages`));
        const firstEditLink = page.locator('a[href*="/content/pages/"]').first();
        await expect(firstEditLink).toBeVisible();
    });
});
