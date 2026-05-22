import { expect, test } from '@playwright/test';
import { seedCms } from './fixtures/seed-cms';

const TENANT_ID = process.env.E2E_TENANT_ID ?? 'staging-tenant';

const VIEWPORTS = [
    { width: 375, height: 667, label: 'iphone-se' },
    { width: 768, height: 1024, label: 'md' },
    { width: 1280, height: 800, label: 'lg' },
    { width: 1440, height: 900, label: 'xl' },
];

const TRIGGER_LABELS_BY_VARIANT: Record<string, string> = {
    'editorial-columns': 'Editorial',
    'compact-list': 'Compact',
    'featured-promo': 'Featured',
};

test.describe('header mega-menu — variants × viewports', () => {
    test.beforeAll(async () => {
        await seedCms({ tenantId: TENANT_ID });
    });

    for (const vp of VIEWPORTS) {
        for (const [variant, label] of Object.entries(TRIGGER_LABELS_BY_VARIANT)) {
            test(`${variant} renders at ${vp.label} without console errors`, async ({ page }) => {
                const errors: string[] = [];
                page.on('pageerror', (err) => errors.push(err.message));
                page.on('console', (msg) => {
                    if (msg.type() === 'error') errors.push(msg.text());
                });

                await page.setViewportSize({ width: vp.width, height: vp.height });
                await page.goto('/');

                const trigger = page.getByRole('button', { name: new RegExp(`Menu: ${label}`, 'i') });
                await trigger.click();

                const panel = page.locator(`[data-header-variant="${variant}"]`);
                await expect(panel).toBeVisible();

                expect(errors, `Console errors at ${variant}/${vp.label}:\n${errors.join('\n')}`).toEqual([]);
            });
        }
    }

    test('Compact List touch hit targets ≥ 44px at 375px', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        const trigger = page.getByRole('button', { name: /Menu: Compact/i });
        await trigger.click();
        const links = page.locator('[data-header-compact-list] a');
        const count = await links.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i++) {
            const box = await links.nth(i).boundingBox();
            expect(box?.height ?? 0, `link #${i} too short`).toBeGreaterThanOrEqual(44);
        }
    });

    test('Active trigger scrolls into inline-start view on open at 375px', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        const triggers = page.locator('nav button[aria-haspopup="menu"]');
        const last = triggers.last();
        const navBefore = await page
            .locator('nav')
            .first()
            .evaluate((el) => el.scrollLeft);
        await last.click();
        await page.waitForTimeout(400);
        const navAfter = await page
            .locator('nav')
            .first()
            .evaluate((el) => el.scrollLeft);
        expect(navAfter, 'nav should have scrolled when opening the last trigger').not.toBe(navBefore);
    });
});
