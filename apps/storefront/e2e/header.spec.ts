import { expect, test } from '@playwright/test';
import { seedCms } from './fixtures/seed-cms';

const TENANT_ID = process.env.E2E_TENANT_ID ?? 'staging-tenant';

test.describe('Header (CMS)', () => {
    test.beforeAll(async () => {
        await seedCms({ tenantId: TENANT_ID });
    });

    test('renders CMS-driven nav links', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('button', { name: /Menu: Editorial/i })).toBeVisible();
    });

    test('opens the mega-menu on Editorial click', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: /Menu: Editorial/i }).click();
        await expect(page.getByText('Pucker-up classics.')).toBeVisible();
    });

    test('closes the mega-menu on Escape', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: /Menu: Editorial/i }).click();
        await expect(page.getByText('Pucker-up classics.')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByText('Pucker-up classics.')).toBeHidden();
    });

    test('closes the mega-menu on outside click', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: /Menu: Editorial/i }).click();
        await expect(page.getByText('Pucker-up classics.')).toBeVisible();
        await page.locator('footer').click();
        await expect(page.getByText('Pucker-up classics.')).toBeHidden();
    });
});
