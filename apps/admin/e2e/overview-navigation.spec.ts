import { expect, test } from '@playwright/test';

import { DOMAIN } from './fixtures/editor';

/**
 * The settings and content overview hubs through the REAL admin app: each renders its heading and the
 * section cards in the content pane, and a card navigates to the matching editor route. The shell
 * renders the SAME sections in the icon rail and the `@subnav` panel too, so assertions scope to the
 * content `<main>` (the rail/subnav are sibling panels, never inside it) to target the hub cards
 * unambiguously. The seeded e2e operator holds the `admin` permission, so the admin-gated cards
 * (Users/Tenants/Media) render.
 */
test.describe('Overview hubs', () => {
    test('the settings overview renders its sections and navigates', async ({ page }) => {
        await page.goto(`/${DOMAIN}/settings/`);
        const main = page.getByRole('main');
        await expect(main.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
        await expect(main.getByRole('heading', { name: 'Users' })).toBeVisible();
        await expect(main.getByRole('heading', { name: 'Media' })).toBeVisible();

        // The Users card's action link routes to the editor; the href anchors it past the rail/subnav.
        await main.locator('a[href$="/settings/users/"]').click();
        await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/settings/users`));
    });

    test('the content overview renders its sections and navigates', async ({ page }) => {
        await page.goto(`/${DOMAIN}/content/`);
        const main = page.getByRole('main');
        await expect(main.getByRole('heading', { level: 1, name: 'Content' })).toBeVisible();
        await expect(main.getByRole('heading', { name: 'Pages' })).toBeVisible();
        await expect(main.getByRole('heading', { name: 'Footer' })).toBeVisible();

        await main.locator('a[href$="/content/footer/"]').click();
        await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/footer`));
    });
});
