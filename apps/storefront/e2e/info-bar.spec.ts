import { expect, test } from '@playwright/test';
import { seedCms } from './fixtures/seed-cms';

const TENANT_ID = process.env.E2E_TENANT_ID ?? 'staging-tenant';

test.describe('InfoBar (CMS)', () => {
    test.beforeAll(async () => {
        await seedCms({ tenantId: TENANT_ID });
    });

    test('renders mailto + tel links', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('link', { name: /email/i })).toHaveAttribute(
            'href',
            'mailto:hello@nordcom-demo-shop.example.com',
        );
        await expect(page.getByRole('link', { name: /phone/i })).toHaveAttribute('href', /tel:\+?[0-9]+/);
    });
});
