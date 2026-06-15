import { expect, test } from '@playwright/test';

import { addArrayRow, DOMAIN, fieldControl, waitForAutosave } from './fixtures/editor';

/**
 * The business-data editor flow end to end through the REAL admin app: a tenant-singleton editor with
 * a flat text field, an email field, a grouped `address` (dotted leaf paths), and a `profiles` array —
 * the 2s autosave, a reload round-trip, and publish.
 *
 * Runs serial: each step builds on the document the previous one persisted; a per-run token keeps
 * assertions honest against the shared deployment.
 */
test.describe.configure({ mode: 'serial' });

/** Unique per-run marker so assertions never pass on a previous run's data. */
const RUN_TOKEN = `e2e-${Date.now()}`;

test('authors legal name, support email, grouped address, and a social profile; autosaves; reloads; publishes', async ({
    page,
}) => {
    await page.goto(`/${DOMAIN}/content/business-data/`);
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/business-data/\\?locale=`));

    // ── Flat + grouped leaf fields. ──
    const legalName = `Nordcom Studio ${RUN_TOKEN}`;
    await fieldControl(page, 'legalName', 'input').fill(legalName);
    await fieldControl(page, 'supportEmail', 'input').fill(`support-${RUN_TOKEN}@example.com`);
    await fieldControl(page, 'supportPhone', 'input').fill('+46 8 123 456');
    await fieldControl(page, 'address.line1', 'input').fill(`${RUN_TOKEN} Storgatan 1`);
    await fieldControl(page, 'address.city', 'input').fill('Stockholm');
    await fieldControl(page, 'address.country', 'input').fill('Sweden');

    // ── A profiles array row through the real add control (rerun-safe). ──
    if ((await page.locator('[data-testid="field-profiles.0.platform"]').count()) === 0) {
        await addArrayRow(page, 'profiles');
    }
    await fieldControl(page, 'profiles.0.platform', 'input').fill('instagram');
    await fieldControl(page, 'profiles.0.handle', 'input').fill(`nordcom-${RUN_TOKEN}`);

    // ── 2s autosave persists the draft; a full reload re-reads it. ──
    await waitForAutosave(page);
    await page.reload();
    await expect(fieldControl(page, 'legalName', 'input')).toHaveValue(legalName);
    await expect(fieldControl(page, 'address.city', 'input')).toHaveValue('Stockholm');
    await expect(fieldControl(page, 'profiles.0.handle', 'input')).toHaveValue(`nordcom-${RUN_TOKEN}`);

    // ── Publish; the toolbar surfaces no error. ──
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByTestId('editor-toolbar-error')).toHaveCount(0);
    await expect(page.getByText(/Last saved/)).toBeVisible({ timeout: 15_000 });

    // The published state survives a reload.
    await page.reload();
    await expect(fieldControl(page, 'legalName', 'input')).toHaveValue(legalName);
});
