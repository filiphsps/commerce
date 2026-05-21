import { expect, test } from '@playwright/test';
import { seedCms } from './fixtures/seed-cms';

const TENANT_ID = process.env.E2E_TENANT_ID ?? 'staging-tenant';

test.describe('Footer (CMS)', () => {
    test.beforeAll(async () => {
        await seedCms({ tenantId: TENANT_ID });
    });

    test('renders the Help section link', async ({ page }) => {
        await page.goto('/');
        const footer = page.locator('footer');
        await expect(footer.getByText('Help')).toBeVisible();
        await expect(footer.getByRole('link', { name: 'Contact' })).toBeVisible();
    });

    test('renders the Instagram social link', async ({ page }) => {
        await page.goto('/');
        const footer = page.locator('footer');
        await expect(footer.getByRole('link', { name: 'instagram' })).toHaveAttribute(
            'href',
            'https://instagram.com/example',
        );
    });

    test('renders the legal Privacy link and the copyright line', async ({ page }) => {
        await page.goto('/');
        const footer = page.locator('footer');
        await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible();
        await expect(footer.getByText('© Example 2026')).toBeVisible();
    });
});
