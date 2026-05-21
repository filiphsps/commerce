import { expect, test } from '@playwright/test';
import { seedCms } from './fixtures/seed-cms';

const TENANT_ID = process.env.E2E_TENANT_ID ?? 'staging-tenant';

test.describe('Header (CMS)', () => {
    test.beforeAll(async () => {
        await seedCms({ tenantId: TENANT_ID });
    });

    test('renders CMS-driven nav links', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('link', { name: 'Docs' })).toBeVisible();
    });

    test('opens the mega-menu on Shop click', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Shop' }).click();
        await expect(page.getByText('Things for the head')).toBeVisible();
    });

    test('closes the mega-menu on Escape', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Shop' }).click();
        await expect(page.getByText('Things for the head')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByText('Things for the head')).toBeHidden();
    });

    test('closes the mega-menu on outside click', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Shop' }).click();
        await expect(page.getByText('Things for the head')).toBeVisible();
        await page.locator('footer').click();
        await expect(page.getByText('Things for the head')).toBeHidden();
    });
});
