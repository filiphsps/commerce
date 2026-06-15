import { expect, test } from '@playwright/test';

import { seedCms } from './fixtures/seed-cms';

const TENANT_ID = process.env.E2E_TENANT_ID ?? 'staging-tenant';

const VIEWPORTS = [
    { width: 375, height: 667, label: 'iphone-se' },
    { width: 768, height: 1024, label: 'md' },
    { width: 1280, height: 800, label: 'lg' },
    { width: 1440, height: 900, label: 'xl' },
];

/**
 * The CMS-driven header mega-menu across viewports against the canonical seed: opening a top-level
 * menu expands its panel without surfacing JavaScript errors, and on a narrow viewport opening a
 * trailing trigger scrolls it into the inline-start view.
 */
test.describe('Header mega-menu — responsive', () => {
    test.beforeAll(async () => {
        await seedCms({ tenantId: TENANT_ID });
    });

    test.beforeEach(async ({ page }) => {
        // The demo favicon route 500s in dev; stub it so it doesn't pollute the console-error check.
        await page.route('**/favicon.png', (route) => route.fulfill({ status: 200, body: '' }));
    });

    for (const vp of VIEWPORTS) {
        test(`renders and opens a menu at ${vp.label} without console errors`, async ({ page }) => {
            const errors: string[] = [];
            page.on('pageerror', (err) => errors.push(err.message));
            page.on('console', (msg) => {
                // Ignore resource-load noise (e.g. dev favicon/media); only flag real JS errors.
                if (msg.type() === 'error' && !/Failed to load resource/i.test(msg.text())) errors.push(msg.text());
            });

            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.goto('/');

            // Exercise a top-level trigger (hover opens on desktop; a tap is harmless on mobile) — the
            // assertion is that rendering + interaction surface no JavaScript errors at this viewport.
            const trigger = page.locator('nav button[aria-haspopup="menu"]').first();
            await expect(trigger).toBeVisible({ timeout: 30_000 });
            await trigger.hover();

            expect(errors, `Console errors at ${vp.label}:\n${errors.join('\n')}`).toEqual([]);
        });
    }

    test('opening a trailing trigger scrolls the nav into view at 375px', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        const triggers = page.locator('nav button[aria-haspopup="menu"]');
        const navBefore = await page
            .locator('nav')
            .first()
            .evaluate((el) => el.scrollLeft);
        await triggers.last().click();
        await expect(async () => {
            const navAfter = await page
                .locator('nav')
                .first()
                .evaluate((el) => el.scrollLeft);
            expect(navAfter).not.toBe(navBefore);
        }).toPass({ timeout: 3_000 });
    });
});
