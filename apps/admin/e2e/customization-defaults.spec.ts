import { expect, test } from '@playwright/test';

import { DOMAIN, fieldControl, waitForAutosave } from './fixtures/editor';

/** The collection-surface product-card CTA placement default — the headline store-wide setting. */
const CTA_PATH = 'extensions.productCard.collection.ctaPlacement';

/**
 * The Customization hub flow through the REAL admin app: the Components tab renders product-card
 * store defaults via the shared field registry, the inherit/override control reveals the native
 * select on override, and the toolbar persists the override to the shop's extension manifest. The
 * spec leaves the shared tenant unchanged by resetting the setting back to inherit at the end.
 */
test.describe('Customization — store-wide component defaults', () => {
    test('overriding the product-card CTA default persists across reload, then resets to inherit', async ({ page }) => {
        await page.goto(`/${DOMAIN}/settings/customization/`);
        // The editor normalizes the URL onto the tenant's default locale.
        await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/settings/customization/\\?locale=`));

        // Open the Components tab and override the collection-surface CTA placement.
        await page.getByRole('tab', { name: 'Components' }).click();
        await page.getByTestId(`override-override-${CTA_PATH}`).click();
        await fieldControl(page, CTA_PATH, 'select').selectOption('inline-button');

        // Persist without error.
        await page.getByRole('button', { name: 'Save Draft' }).click();
        await expect(page.getByTestId('editor-toolbar-error')).toHaveCount(0);
        await waitForAutosave(page);

        // Reload → the override is durable.
        await page.reload();
        await page.getByRole('tab', { name: 'Components' }).click();
        await expect(page.getByTestId(`override-override-${CTA_PATH}`)).toHaveAttribute('aria-pressed', 'true');
        await expect(fieldControl(page, CTA_PATH, 'select')).toHaveValue('inline-button');

        // Reset to inherit so the shared tenant is left as it was found.
        await page.getByTestId(`override-inherit-${CTA_PATH}`).click();
        await expect(page.getByTestId(`override-inherited-${CTA_PATH}`)).toBeVisible();
        await page.getByRole('button', { name: 'Save Draft' }).click();
        await expect(page.getByTestId('editor-toolbar-error')).toHaveCount(0);
        await waitForAutosave(page);
    });
});
