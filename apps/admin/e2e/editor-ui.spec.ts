import { expect, test } from '@playwright/test';

// Use the seeded shop domain. Matches the shop document created locally;
// CI runs against a fresh Mongo so this domain is created by the seed
// script if absent.
const SHOP_DOMAIN = process.env.E2E_SHOP_DOMAIN ?? 'beta.pouched.de';

/**
 * These tests rely on:
 *  - The seeded test user (e2e/fixtures/seed.ts)
 *  - A shop document with `domain` === SHOP_DOMAIN
 *  - At least one page document under that shop
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

    test('text input is themed (Payload CSS loaded + bridge active)', async ({ page }) => {
        await page.goto(`/${SHOP_DOMAIN}/content/pages/`);
        const firstEditLink = page.locator('a[href*="/content/pages/"][href$="/"]').first();
        await firstEditLink.click();
        await page.waitForLoadState('networkidle');

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

    test('no horizontal overflow at 1440, 1024, 640', async ({ page }) => {
        for (const [width, height] of [
            [1440, 900],
            [1024, 768],
            [640, 900],
        ] as const) {
            await page.setViewportSize({ width, height });
            await page.goto(`/${SHOP_DOMAIN}/content/pages/`);
            const firstEditLink = page.locator('a[href*="/content/pages/"][href$="/"]').first();
            await firstEditLink.click();
            await page.waitForLoadState('networkidle');

            const overflows = await page.evaluate(
                () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
            );
            expect(overflows, `viewport ${width}x${height} caused horizontal overflow`).toBe(false);
        }
    });
});
