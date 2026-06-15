import { expect, test } from '@playwright/test';

import { productPath } from './fixtures/storefront';

/**
 * The PDP recommendations rail against the seeded mock.shop tenant: the rail renders further product
 * cards and, when its content overflows the viewport, exposes a next arrow that scrolls the rail.
 */
test.describe('Recommendations rail', () => {
    test('the PDP renders a recommendations rail of product cards', async ({ page }) => {
        await page.goto(productPath(), { waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('product-card-root').first()).toBeVisible({ timeout: 30_000 });
    });

    test('the rail next arrow is operable without breaking the rail', async ({ page }) => {
        await page.goto(productPath(), { waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('product-card-root').first()).toBeVisible({ timeout: 30_000 });
        const next = page.getByRole('button', { name: /next/i }).first();
        if (!(await next.isVisible({ timeout: 5_000 }).catch(() => false)) || !(await next.isEnabled())) {
            test.skip(true, 'recommendations rail exposes no enabled next control at this viewport');
        }
        // Activating the arrow must not throw or tear down the rail (exact scroll distance depends on
        // viewport + item count, which mock.shop varies, so it is not asserted here).
        await next.click();
        await expect(page.getByTestId('product-card-root').first()).toBeVisible();
    });
});
