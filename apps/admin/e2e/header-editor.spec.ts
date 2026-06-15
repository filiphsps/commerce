import { expect, type Page, test } from '@playwright/test';

// The seeded canonical tenant (e2e/global-setup.ts). CI/staging may override.
const DOMAIN = process.env.E2E_SHOP_DOMAIN ?? 'nordcom-demo-shop.com';

/**
 * CMSGATE-01 — the header editor flow end to end through the REAL admin app:
 * depth-6 nav authoring on the native form engine, the 2s autosave, publish,
 * and version restore. The same flow is proven at the integration level in
 * `src/lib/header-editor-gate.test.tsx` (vitest + the real Convex functions);
 * this spec exercises it through the browser against the live deployment the
 * e2e harness boots.
 *
 * The flow runs as ONE serial test: each step builds on the document state the
 * previous step persisted, and a unique run token keeps reruns against a
 * shared deployment honest (every assertion checks THIS run's values).
 */
test.describe.configure({ mode: 'serial' });

/** Unique per-run marker so assertions can never pass on a previous run's data. */
const RUN_TOKEN = `e2e-${Date.now()}`;

/**
 * The dotted form-state path of the index-0 nav node at nesting `level`
 * (1-based): `items.0`, `items.0.items.0`, …
 *
 * @param level - Nav depth, 1 through 6.
 * @returns The node's dotted path.
 */
const navPath = (level: number): string => Array.from({ length: level }, () => 'items.0').join('.');

/**
 * Locator for the control inside the native field shell at a dotted path.
 *
 * @param page - The Playwright page.
 * @param path - The field's dotted form-state path.
 * @param control - The control selector inside the shell (`input`, `textarea`, `select`).
 * @returns The control locator.
 */
const fieldControl = (page: Page, path: string, control: string) =>
    page.locator(`[data-testid="field-${path}"] ${control}`);

/** The toolbar's autosave cadence (EditorFormToolbar `autosave.interval`). */
const AUTOSAVE_INTERVAL_MS = 2_000;

/**
 * Waits for the interval autosave to QUIESCE — every pending edit round-tripped.
 *
 * "Last saved" is sticky: the toolbar sets it on the first tick and never clears
 * it, so a bare `getByText(/Last saved/)` check races the 2s clock and returns on
 * an EARLIER tick — before the latest edit (or, building a deep spine, an
 * intermediate one) has been posted, which then vanishes on reload. The loop reads
 * live state each tick and exposes no per-edit completion signal, so poll until
 * "Saving…" stays absent across a full interval: no tick finding divergence means
 * the form is clean and every edit is durable.
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

test('builds a depth-6 nav item, autosaves on the 2s clock, survives a reload, publishes, and restores', async ({
    page,
}) => {
    await page.goto(`/${DOMAIN}/content/header/`);
    // The edit page normalizes the URL onto the tenant's default locale.
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/header/\\?locale=`));

    // ── Build the depth-6 spine through the real array widgets. ──
    // Level 1 may already exist from a previous run; add rows only when the
    // level's leaf shell is absent so the spec is rerun-safe.
    for (let level = 1; level <= 6; level++) {
        const leafShell = page.locator(`[data-testid="field-${navPath(level)}.backgroundColor"]`);
        if ((await leafShell.count()) === 0) {
            const addPath = level === 1 ? 'items' : `${navPath(level - 1)}.items`;
            await page.locator(`[data-testid="array-add-${addPath}"]`).first().click();
        }
        await expect(leafShell).toBeVisible();
    }

    // Every level mounts an EDITABLE leaf; stamp each with this run's token.
    for (let level = 1; level <= 6; level++) {
        await fieldControl(page, `${navPath(level)}.backgroundColor`, 'input').fill(`#${level}${RUN_TOKEN.slice(-4)}`);
    }
    // Per-item variant select exists at the top level only.
    await fieldControl(page, 'items.0.variant', 'select').selectOption('compact-list');
    await expect(page.locator(`[data-testid="field-${navPath(2)}.variant"]`)).toHaveCount(0);

    // The depth-6 leaf gets editorial copy (a localized textarea).
    const deepCopy = `Level-six copy ${RUN_TOKEN}`;
    await fieldControl(page, `${navPath(6)}.description`, 'textarea').fill(deepCopy);

    // ── 2s autosave persists the draft without an explicit save. ──
    await waitForAutosave(page);

    // A full reload re-reads through the bridge: the deep edit survived.
    await page.reload();
    await expect(fieldControl(page, `${navPath(6)}.description`, 'textarea')).toHaveValue(deepCopy, {
        timeout: 15_000,
    });
    await expect(fieldControl(page, 'items.0.variant', 'select')).toHaveValue('compact-list');

    // ── Publish. ──
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText(/Last saved/)).toBeVisible({ timeout: 15_000 });

    // ── Overwrite the deep leaf, save the draft, then restore the published version. ──
    const overwritten = `Overwritten ${RUN_TOKEN}`;
    await fieldControl(page, `${navPath(6)}.description`, 'textarea').fill(overwritten);
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page.getByText(/Last saved/)).toBeVisible({ timeout: 15_000 });

    await page.goto(`/${DOMAIN}/content/header/versions/`);
    await expect(page.getByRole('button', { name: 'Restore' }).first()).toBeVisible({ timeout: 15_000 });
    // Rows are oldest-first; restore this run's PUBLISHED snapshot — the last
    // row whose status label reads "published" (interleaved autosave drafts may
    // follow it, so "last enabled" would be ambiguous).
    await page.locator('li', { hasText: 'published' }).last().getByRole('button', { name: 'Restore' }).click();

    // The restore re-materialized the published snapshot as the live draft.
    await page.goto(`/${DOMAIN}/content/header/`);
    await expect(fieldControl(page, `${navPath(6)}.description`, 'textarea')).toHaveValue(deepCopy, {
        timeout: 15_000,
    });
});
