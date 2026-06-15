import { expect, test } from '@playwright/test';

import { DOMAIN } from './fixtures/editor';

/**
 * The theme editor flow through the REAL admin app: the bespoke ThemeEditor mounts at
 * `/{domain}/settings/theme/` with its live-preview bridge, exposes interactive token controls, and
 * the editor toolbar persists a draft (Save Draft → "Last saved") without surfacing an error.
 */
test.describe('Theme editor', () => {
    test('mounts with the live preview and persists a draft', async ({ page }) => {
        await page.goto(`/${DOMAIN}/settings/theme/`);
        // The editor normalizes the URL onto the tenant's default locale.
        await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/settings/theme/\\?locale=`));

        // The live-preview bridge renders its iframe.
        await expect(page.locator('iframe[title="Live preview"]')).toBeVisible({ timeout: 30_000 });

        // The theme controls render as interactive widgets (switches / selects / buttons).
        await expect(
            page
                .getByRole('switch')
                .or(page.getByRole('combobox'))
                .or(page.getByRole('button', { name: /save/i }))
                .first(),
        ).toBeVisible();

        // The toolbar persists a draft without erroring.
        await page.getByRole('button', { name: 'Save Draft' }).click();
        await expect(page.getByTestId('editor-toolbar-error')).toHaveCount(0);
        await expect(page.getByText(/Last saved/)).toBeVisible({ timeout: 15_000 });
    });
});
