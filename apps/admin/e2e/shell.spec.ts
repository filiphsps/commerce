import { expect, test } from '@playwright/test';

const DOMAIN = process.env.ADMIN_E2E_SHOP_DOMAIN ?? 'beta.pouched.de';

test.describe('Admin shell', () => {
    test('renders header and sub-nav on /content', async ({ page }) => {
        await page.goto(`/${DOMAIN}/content/`);
        await expect(page.getByRole('heading', { level: 1, name: 'Content' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Articles' })).toBeVisible();
    });

    test('sub-nav is absent on /', async ({ page }) => {
        await page.goto(`/${DOMAIN}/`);
        // Home does not provide a sub-nav slot; the panel collapses
        await expect(page.locator('aside[class*="border-r-2"]')).toHaveCount(0);
    });

    test('command palette opens on ⌘K', async ({ page }) => {
        await page.goto(`/${DOMAIN}/`);
        await page.keyboard.press('Meta+k');
        await expect(page.getByPlaceholder(/Type a command/i)).toBeVisible();
    });

    test('mobile drawer opens', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto(`/${DOMAIN}/`);
        await page.getByRole('button', { name: /Open menu/i }).click();
        await expect(page.getByRole('dialog', { name: /Navigate/i })).toBeVisible();
    });
});
