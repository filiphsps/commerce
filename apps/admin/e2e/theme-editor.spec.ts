import { expect, test } from '@playwright/test';

import { DOMAIN } from './fixtures/editor';

/**
 * The theme editor now lives as the Theme tab of the unified Customization hub. The legacy
 * `/settings/theme/` route redirects there; the theme editor mounts with its live-preview bridge,
 * exposes interactive token controls, and the shared editor toolbar persists a draft without error.
 */
test.describe('Theme editor', () => {
    test('the legacy theme route redirects into the hub and persists a draft', async ({ page }) => {
        await page.goto(`/${DOMAIN}/settings/theme/`);
        // Redirected into the Customization hub's Theme tab (locale normalized by the editor host).
        await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/settings/customization/\\?.*locale=`));

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
