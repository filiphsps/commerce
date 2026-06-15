import { expect, test } from '@playwright/test';

import { addArrayRow, DOMAIN, fieldControl, waitForAutosave } from './fixtures/editor';

/**
 * The footer editor flow end to end through the REAL admin app: a tenant-singleton editor (like the
 * header) authored through the native array widgets — a `sections` group with a nested `links` array,
 * a `social` row whose platform is a select, a `legal` row, and the localized `copyrightLine` — the
 * 2s autosave, a reload round-trip, publish, and version restore.
 *
 * Runs serial: each step builds on the document the previous one persisted, and a per-run token keeps
 * assertions honest against the shared deployment.
 */
test.describe.configure({ mode: 'serial' });

/** Unique per-run marker so assertions never pass on a previous run's data. */
const RUN_TOKEN = `e2e-${Date.now()}`;

test('authors footer sections/social/legal + copyright, autosaves, reloads, publishes, and restores', async ({
    page,
}) => {
    await page.goto(`/${DOMAIN}/content/footer/`);
    // The edit page normalizes the URL onto the tenant's default locale.
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/footer/\\?locale=`));

    // ── Build one of each top-level array row, rerun-safe: add only when the
    // row's leaf shell is absent so a re-run against the shared deployment does
    // not stack duplicates. ──
    if ((await page.locator('[data-testid="field-sections.0.title"]').count()) === 0) {
        await addArrayRow(page, 'sections');
    }
    await expect(page.locator('[data-testid="field-sections.0.title"]')).toBeVisible();
    if ((await page.locator('[data-testid="field-sections.0.links.0.link"]').count()) === 0) {
        await addArrayRow(page, 'sections.0.links');
    }
    if ((await page.locator('[data-testid="field-social.0.platform"]').count()) === 0) {
        await addArrayRow(page, 'social');
    }
    if ((await page.locator('[data-testid="field-legal.0.link"]').count()) === 0) {
        await addArrayRow(page, 'legal');
    }

    // ── Leaf edits across the row set. ──
    const sectionTitle = `Help ${RUN_TOKEN}`;
    await fieldControl(page, 'sections.0.title', 'input').fill(sectionTitle);
    await fieldControl(page, 'social.0.platform', 'select').selectOption('instagram');
    await fieldControl(page, 'social.0.url', 'input').fill(`https://instagram.com/${RUN_TOKEN}`);
    const copyright = `© ${RUN_TOKEN} Nordcom`;
    await fieldControl(page, 'copyrightLine', 'input').fill(copyright);

    // ── 2s autosave persists the draft, then a full reload re-reads it. ──
    await waitForAutosave(page);
    await page.reload();
    await expect(fieldControl(page, 'sections.0.title', 'input')).toHaveValue(sectionTitle);
    await expect(fieldControl(page, 'social.0.platform', 'select')).toHaveValue('instagram');
    await expect(fieldControl(page, 'copyrightLine', 'input')).toHaveValue(copyright);

    // ── Publish; the toolbar surfaces no error. ──
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByTestId('editor-toolbar-error')).toHaveCount(0);
    await expect(page.getByText(/Last saved/)).toBeVisible({ timeout: 15_000 });

    // ── Overwrite the copyright, save a draft, then restore the published snapshot. ──
    await fieldControl(page, 'copyrightLine', 'input').fill(`Overwritten ${RUN_TOKEN}`);
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page.getByText(/Last saved/)).toBeVisible({ timeout: 15_000 });

    await page.goto(`/${DOMAIN}/content/footer/versions/`);
    await page.locator('li', { hasText: 'published' }).first().getByRole('button', { name: 'Restore' }).click();
    // Restore is a Server Action form submit; let its revalidation commit before navigating back, or
    // the editor's one-shot load reads the pre-restore draft.
    await page.waitForLoadState('networkidle');

    await page.goto(`/${DOMAIN}/content/footer/`);
    await expect(fieldControl(page, 'copyrightLine', 'input')).toHaveValue(copyright, { timeout: 15_000 });
});
