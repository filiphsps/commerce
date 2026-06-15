import { expect, test } from '@playwright/test';

import { seedCms } from './fixtures/seed-cms';

const TENANT_ID = process.env.E2E_TENANT_ID ?? 'staging-tenant';

/**
 * The CMS-driven footer against the canonical seed: the section links, the Instagram social link (with
 * its concrete href), the legal links, and the copyright line all render.
 */
test.describe('Footer (CMS)', () => {
    test.beforeAll(async () => {
        await seedCms({ tenantId: TENANT_ID });
    });

    test('renders section links', async ({ page }) => {
        await page.goto('/');
        const footer = page.locator('footer');
        await expect(footer.getByRole('link', { name: 'Contact' }).first()).toBeVisible();
        await expect(footer.getByRole('link', { name: 'About' }).first()).toBeVisible();
    });

    test('renders the Instagram social link with its href', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('footer').getByRole('link', { name: 'instagram' })).toHaveAttribute(
            'href',
            'https://instagram.com/nordcom-demo',
        );
    });

    test('renders the legal Privacy link and the copyright line', async ({ page }) => {
        await page.goto('/');
        const footer = page.locator('footer');
        await expect(footer.getByRole('link', { name: /privacy/i }).first()).toBeVisible();
        await expect(footer.getByText(/©\s*2026\s+Nordcom Demo Shop/i)).toBeVisible();
    });
});
