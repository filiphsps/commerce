import { expect, test } from '@playwright/test';

import { DOMAIN } from './fixtures/editor';

/**
 * The settings and content overview hubs through the REAL admin app: each renders its heading and the
 * cards/links into its sub-sections, and a card navigates to the matching editor route. The seeded
 * e2e operator holds the `admin` permission, so the admin-gated cards (Users/Tenants/Media) render.
 */
test.describe('Overview hubs', () => {
    test('the settings overview renders its sections and navigates', async ({ page }) => {
        await page.goto(`/${DOMAIN}/settings/`);
        await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Media' })).toBeVisible();

        await page.getByRole('link', { name: 'Users' }).click();
        await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/settings/users`));
    });

    test('the content overview renders its sections and navigates', async ({ page }) => {
        await page.goto(`/${DOMAIN}/content/`);
        await expect(page.getByRole('heading', { level: 1, name: 'Content' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Pages' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Footer' })).toBeVisible();

        await page.getByRole('link', { name: 'Footer' }).click();
        await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/footer`));
    });
});
