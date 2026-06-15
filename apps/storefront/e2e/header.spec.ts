import { expect, test } from '@playwright/test';

import { seedCms } from './fixtures/seed-cms';
import { openMegaMenu } from './fixtures/storefront';

const TENANT_ID = process.env.E2E_TENANT_ID ?? 'staging-tenant';

/**
 * The CMS-driven header against the canonical seed: the top-level nav renders, and the "Shop"
 * mega-menu opens (hover on a fine pointer, click otherwise), exposes its panel, and closes on Escape
 * and on an outside click.
 */
test.describe('Header (CMS)', () => {
    test.beforeAll(async () => {
        await seedCms({ tenantId: TENANT_ID });
    });

    test('renders the CMS-driven top-level nav', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('button', { name: 'Menu: Shop' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Menu: Journal' })).toBeVisible();
    });

    test('opens the Shop mega-menu and shows its panel', async ({ page }) => {
        await page.goto('/');
        await openMegaMenu(page, 'Menu: Shop');
        await expect(page.getByRole('link', { name: 'Shop the collection' }).first()).toBeVisible();
    });

    test('closes the mega-menu on Escape', async ({ page }) => {
        await page.goto('/');
        const trigger = await openMegaMenu(page, 'Menu: Shop');
        await page.keyboard.press('Escape');
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('closes the mega-menu on an outside click', async ({ page }) => {
        await page.goto('/');
        const trigger = await openMegaMenu(page, 'Menu: Shop');
        // A mousedown outside both the trigger and the portaled panel closes it.
        await page.locator('footer').click({ position: { x: 5, y: 5 } });
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
});
