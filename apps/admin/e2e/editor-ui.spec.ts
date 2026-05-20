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

/**
 * Navigate to the pages list and return the href of the first edit link.
 * Navigating directly avoids a two-step list→click sequence that can race
 * against Turbopack's per-route compilation window.
 */
async function getFirstPageEditUrl(page: import('@playwright/test').Page): Promise<string> {
    await page.goto(`/${SHOP_DOMAIN}/content/pages/`);
    await expect(page).toHaveURL(new RegExp(`/${SHOP_DOMAIN}/content/pages`));
    const firstEditLink = page.locator('a[href*="/content/pages/"][href$="/"]').first();
    await expect(firstEditLink).toBeVisible();
    const href = await firstEditLink.getAttribute('href');
    if (!href) throw new Error('No edit link found on pages list');
    return href;
}

test.describe('admin editor UI', () => {
    test('list route reaches a content edit page', async ({ page }) => {
        await page.goto(`/${SHOP_DOMAIN}/content/pages/`);
        await expect(page).toHaveURL(new RegExp(`/${SHOP_DOMAIN}/content/pages`));
        const firstEditLink = page.locator('a[href*="/content/pages/"]').first();
        await expect(firstEditLink).toBeVisible();
    });

    // 90 s: Turbopack must compile two routes (list + edit) cold. On a warm
    // server (after the first run) this takes ~5 s; cold, up to 25 s each.
    test('text input is themed (Payload CSS loaded + bridge active)', async ({ page }) => {
        test.setTimeout(90_000);
        const editUrl = await getFirstPageEditUrl(page);
        // Navigate directly to the edit URL to avoid a double page-load
        // (list compile + edit compile) within the test timeout.
        await page.goto(editUrl);
        // The Slug field renders once Payload's edit form has fully mounted.
        // `networkidle` is intentionally avoided: Payload keeps background
        // fetch activity alive indefinitely in the editor.
        await page.locator('input[name="slug"]').first().waitFor({ state: 'visible' });

        // The Slug field always exists on Page. Probe its computed style.
        const bg = await page
            .locator('input[name="slug"]')
            .first()
            .evaluate((el) => getComputedStyle(el).backgroundColor);
        // Anything but white means Payload's bundled CSS (and our bridge) applied.
        expect(bg).not.toBe('rgb(255, 255, 255)');
        expect(bg).not.toBe('rgba(0, 0, 0, 0)');

        // The bridge points --theme-input-bg at our --input HSL token.
        const bridged = await page.evaluate(() => {
            const root = document.documentElement;
            return {
                themeInputBg: getComputedStyle(root).getPropertyValue('--theme-input-bg').trim(),
                ourInput: getComputedStyle(root).getPropertyValue('--input').trim(),
            };
        });
        expect(bridged.themeInputBg).toContain(bridged.ourInput);
    });

    // 90 s: navigates the edit route at 3 viewports; cold Turbopack compile
    // can take up to 25 s on the first hit.
    test('no horizontal overflow at 1440, 1024, 640', async ({ page }) => {
        test.setTimeout(90_000);
        const editUrl = await getFirstPageEditUrl(page);
        for (const [width, height] of [
            [1440, 900],
            [1024, 768],
            [640, 900],
        ] as const) {
            await page.setViewportSize({ width, height });
            // Navigate directly to the already-resolved edit URL so each
            // viewport iteration only waits for one page load.
            await page.goto(editUrl);
            // Same reasoning as the CSS test: wait for the edit form root
            // rather than networkidle (Payload polls indefinitely).
            await page.locator('input[name="slug"]').first().waitFor({ state: 'visible' });

            const overflows = await page.evaluate(
                () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
            );
            expect(overflows, `viewport ${width}x${height} caused horizontal overflow`).toBe(false);
        }
    });
});
