import { expect, test } from '@playwright/test';

import { addArrayRow, DOMAIN, fieldControl } from './fixtures/editor';

/**
 * The unified Shop settings surface end to end through the REAL admin app (UNIFY-SHOP): the former
 * standalone "Business data" editor is folded in here, alongside the primary-domain picker (sourced
 * from the shop's connected domains), the default-locale dropdown, and the logo/favicon image
 * pickers. This surface writes the REAL `shops` row via `cms/shop_config`, not a `cmsDocuments`
 * singleton.
 *
 * Runs serial: each step builds on what the previous one persisted. A per-run token keeps assertions
 * honest against the shared deployment, and only the additive business-data group is mutated — the
 * primary domain and default locale (routing/locale-critical for other specs) are asserted present,
 * never changed.
 */
test.describe.configure({ mode: 'serial' });

/** Unique per-run marker so assertions never pass on a previous run's data. */
const RUN_TOKEN = `e2e-${Date.now()}`;

test('unauthenticated request to shop settings redirects to login', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`/${DOMAIN}/settings/shop/`);
    await expect(page).toHaveURL(/login|auth/i);
});

test('exposes the unified field surface: primary-domain picker, locale dropdown, and brand-asset pickers', async ({
    page,
}) => {
    await page.goto(`/${DOMAIN}/settings/shop/`);
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/settings/shop/`));

    // Primary domain is a dropdown of connected domains (not a free-text field), defaulting to the
    // shop's current primary.
    const primaryDomain = fieldControl(page, 'primaryDomain', 'select');
    await expect(primaryDomain).toBeVisible();
    await expect(primaryDomain).toHaveValue(DOMAIN);

    // Default locale is a dropdown, not a string field.
    await expect(fieldControl(page, 'i18n.defaultLocale', 'select')).toBeVisible();

    // Logo and favicon are media pickers (file inputs) the header/footer fall back to.
    await expect(fieldControl(page, 'logo', 'input[type="file"]')).toBeVisible();
    await expect(fieldControl(page, 'favicon', 'input[type="file"]')).toBeVisible();
});

test('authors business data on the shop surface; publishes; the values survive a reload', async ({ page }) => {
    await page.goto(`/${DOMAIN}/settings/shop/`);

    const legalName = `Nordcom Studio ${RUN_TOKEN}`;
    await fieldControl(page, 'businessData.legalName', 'input').fill(legalName);
    await fieldControl(page, 'businessData.supportEmail', 'input').fill(`support-${RUN_TOKEN}@example.com`);
    await fieldControl(page, 'businessData.address.city', 'input').fill('Stockholm');

    if ((await page.locator('[data-testid="field-businessData.profiles.0.platform"]').count()) === 0) {
        await addArrayRow(page, 'businessData.profiles');
    }
    await fieldControl(page, 'businessData.profiles.0.platform', 'input').fill('instagram');
    await fieldControl(page, 'businessData.profiles.0.handle', 'input').fill(`nordcom-${RUN_TOKEN}`);

    // Persist through the real toolbar; the toolbar surfaces no error.
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByTestId('editor-toolbar-error')).toHaveCount(0);

    // The persisted state survives a full reload (re-read off the real shop row).
    await page.reload();
    await expect(fieldControl(page, 'businessData.legalName', 'input')).toHaveValue(legalName);
    await expect(fieldControl(page, 'businessData.address.city', 'input')).toHaveValue('Stockholm');
    await expect(fieldControl(page, 'businessData.profiles.0.handle', 'input')).toHaveValue(`nordcom-${RUN_TOKEN}`);
});
