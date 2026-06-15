import { expect, type Page, test } from '@playwright/test';

// The seeded canonical tenant (e2e/global-setup.ts). CI/staging may override.
const DOMAIN = process.env.E2E_SHOP_DOMAIN ?? 'nordcom-demo-shop.com';

/**
 * Live content preview — the redesigned pages editor's split-pane preview, end
 * to end through the REAL admin app. Proves the preview pane mounts beside the
 * fields, loads the storefront's `/api/cms-preview` activation route, and toggles
 * open/closed, while the field surface stays fully authorable alongside it. The
 * postMessage patch/refresh wire contract is unit-covered
 * (`packages/cms/.../preview/messages.test.ts`,
 * `apps/storefront/src/blocks/context.test.ts`); this spec guards the admin-side
 * flow the merchant actually drives.
 */
test.describe.configure({ mode: 'serial' });

/** Unique per-run marker so assertions can never pass on a previous run's data. */
const RUN_TOKEN = `e2e-preview-${Date.now()}`;
const PAGE_TITLE = `Preview page ${RUN_TOKEN}`;
const PAGE_SLUG = `preview-page-${RUN_TOKEN}`;

/** The toolbar's autosave cadence (EditorFormToolbar `autosave.interval`). */
const AUTOSAVE_INTERVAL_MS = 2_000;

/**
 * Locator for the control inside the native field shell at a dotted path.
 *
 * @param page - The Playwright page.
 * @param path - The field's dotted form-state path.
 * @param control - The control selector inside the shell.
 * @returns The control locator.
 */
const fieldControl = (page: Page, path: string, control: string) =>
    page.locator(`[data-testid="field-${path}"] ${control}`);

/**
 * Waits for the interval autosave to QUIESCE — every pending edit round-tripped.
 *
 * @param page - The Playwright page.
 */
async function waitForAutosave(page: Page): Promise<void> {
    await expect(async () => {
        await expect(page.getByText('Saving…')).toBeHidden();
        await page.waitForTimeout(AUTOSAVE_INTERVAL_MS + 300);
        await expect(page.getByText('Saving…')).toBeHidden();
    }).toPass({ timeout: 30_000 });
    await expect(page.getByText(/Last saved/)).toBeVisible({ timeout: 15_000 });
}

test('mounts the live storefront preview beside the fields, loads the cms-preview route, and toggles', async ({
    page,
}) => {
    // Author a page on /new/; the first autosave creates + binds it onto the edit route.
    await page.goto(`/${DOMAIN}/content/pages/new/`);
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/pages/new/\\?locale=`));

    await fieldControl(page, 'title', 'input').fill(PAGE_TITLE);
    await fieldControl(page, 'slug', 'input').fill(PAGE_SLUG);
    await waitForAutosave(page);
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/pages/(?!new/)[^/]+/\\?locale=`));

    // ── The live-preview pane is mounted and points at the storefront's draft-mode
    // activation route (the secret-bearing URL the admin builds server-side). ──
    const previewFrame = page.locator('iframe[title="Live preview"]');
    await expect(previewFrame).toBeVisible();
    await expect(previewFrame).toHaveAttribute('src', /\/api\/cms-preview\?/);

    // ── The pane collapses and re-opens through its own control without
    // disturbing the editor. ──
    await page.getByRole('button', { name: 'Hide preview' }).click();
    await expect(previewFrame).toBeHidden();
    await page.getByRole('button', { name: 'Show preview' }).click();
    await expect(page.locator('iframe[title="Live preview"]')).toBeVisible();

    // ── The field surface stays fully authorable alongside the preview: add a
    // banner block and edit its heading through the redesigned widgets. ──
    await page.locator('[data-testid="blocks-picker-blocks"]').selectOption('banner');
    await page.locator('[data-testid="blocks-add-blocks"]').click();
    await expect(
        page.locator('[data-testid="blocks-row-blocks"][data-row-index="0"][data-block-type="banner"]'),
    ).toBeVisible();
    await fieldControl(page, 'blocks.0.heading', 'input').fill(`Banner ${RUN_TOKEN}`);
    await waitForAutosave(page);

    // The authored content survives a reload (draft round-trip), preview still mounted.
    await page.reload();
    await expect(fieldControl(page, 'title', 'input')).toHaveValue(PAGE_TITLE);
    await expect(fieldControl(page, 'blocks.0.heading', 'input')).toHaveValue(`Banner ${RUN_TOKEN}`);
    await expect(page.locator('iframe[title="Live preview"]')).toBeVisible();
});
