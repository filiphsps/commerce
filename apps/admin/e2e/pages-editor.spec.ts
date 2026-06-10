import { expect, type Page, test } from '@playwright/test';

// The seeded canonical tenant (e2e/global-setup.ts). CI/staging may override.
const DOMAIN = process.env.E2E_SHOP_DOMAIN ?? 'nordcom-demo-shop.com';

/**
 * CMSGATE-02 — the pages editor flow end to end through the REAL admin app:
 * a new page authored with EVERY one of the nine blocks (including a
 * columns-nested ProseMirror rich-text block), a REAL media upload through the
 * live transport (admin media-upload action → cms/media storage flow → the
 * Node-side sharp pass → saveDerivatives), the 2s autosave, publish, and
 * publish-validation (draft skips required; publish fails closed with the
 * error surfaced in the toolbar). The same flow is proven at the integration
 * level in `src/lib/pages-editor-gate.test.tsx` (vitest + the real Convex
 * functions + real sharp); this spec exercises it through the browser against
 * the live deployment the e2e harness boots.
 */
test.describe.configure({ mode: 'serial' });

/** Unique per-run marker so assertions can never pass on a previous run's data. */
const RUN_TOKEN = `e2e-${Date.now()}`;
const PAGE_TITLE = `Gate page ${RUN_TOKEN}`;
const PAGE_SLUG = `gate-page-${RUN_TOKEN}`;

/** Every block type, in the canonical picker order. */
const ALL_BLOCK_TYPES = [
    'columns',
    'alert',
    'banner',
    'collection',
    'html',
    'media-grid',
    'overview',
    'rich-text',
    'vendors',
] as const;

/** A real, decodable 1x1 PNG the sharp pass resizes into the four frozen sizes. */
const TINY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
);

/** The authored ProseMirror document for the rich-text blocks. */
const PM_DOC = JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: `Body ${RUN_TOKEN}` }] }],
});

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

/**
 * Adds one block row of `type` through the blocks widget's real picker + add
 * control.
 *
 * @param page - The Playwright page.
 * @param path - The blocks field's dotted path.
 * @param type - The block type slug to add.
 */
async function addBlock(page: Page, path: string, type: string): Promise<void> {
    await page.locator(`[data-testid="blocks-picker-${path}"]`).selectOption(type);
    await page.locator(`[data-testid="blocks-add-${path}"]`).click();
}

/**
 * Waits out one full autosave window plus the round-trip, then confirms the
 * toolbar reported a save (the "Last saved …" status only appears after a
 * successful draft round-trip).
 *
 * @param page - The Playwright page.
 */
async function waitForAutosave(page: Page): Promise<void> {
    await expect(page.getByText(/Last saved/)).toBeVisible({ timeout: 15_000 });
}

test('authors all nine blocks (nested rich-text included), uploads media through the live transport, autosaves, and publishes', async ({
    page,
}) => {
    // ── Create the page MINIMALLY on /new/ (title + slug), then move to its
    // edit page for the heavy authoring: /new/'s autosave issues a `create`
    // per diverged tick, so every subsequent save must target the one
    // document id the edit page binds. ──
    await page.goto(`/${DOMAIN}/content/pages/new/`);
    // The creation page normalizes the URL onto the tenant's default locale.
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/pages/new/\\?locale=`));

    await fieldControl(page, 'title', 'input').fill(PAGE_TITLE);
    await fieldControl(page, 'slug', 'input').fill(PAGE_SLUG);
    await waitForAutosave(page);

    await page.goto(`/${DOMAIN}/content/pages/`);
    await page.getByText(PAGE_TITLE).first().click();
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/pages/[^/]+/\\?locale=`));
    await expect(fieldControl(page, 'title', 'input')).toHaveValue(PAGE_TITLE);

    // ── Every one of the nine blocks through the real picker. ──
    for (const type of ALL_BLOCK_TYPES) {
        await addBlock(page, 'blocks', type);
    }
    for (const [index, type] of ALL_BLOCK_TYPES.entries()) {
        await expect(
            page.locator(`[data-testid="blocks-row-blocks"][data-row-index="${index}"][data-block-type="${type}"]`),
        ).toBeVisible();
    }

    // ── Columns-nested rich-text: the ProseMirror block inside the layout
    // block (the columns block's minRows-1 column row mounts automatically). ──
    await addBlock(page, 'blocks.0.columns.0.content', 'rich-text');
    await fieldControl(page, 'blocks.0.columns.0.content.0.body', 'textarea').fill(PM_DOC);

    // Leaf edits across the block set.
    await fieldControl(page, 'blocks.1.title', 'input').fill(`Alert ${RUN_TOKEN}`);
    await fieldControl(page, 'blocks.2.heading', 'input').fill(`Banner ${RUN_TOKEN}`);
    await fieldControl(page, 'blocks.3.handle', 'input').fill('frontpage');
    await fieldControl(page, 'blocks.4.html', 'textarea').fill(`<p>${RUN_TOKEN}</p>`);
    await fieldControl(page, 'blocks.7.body', 'textarea').fill(PM_DOC);
    await fieldControl(page, 'blocks.8.title', 'input').fill(`Vendors ${RUN_TOKEN}`);

    // Relationship options load from the live bounded Convex list path: the
    // banner CTA's page picker lists this very page.
    await fieldControl(page, 'blocks.2.cta.kind', 'select').selectOption('page');
    await expect(
        fieldControl(page, 'blocks.2.cta.page', 'select').locator('option', { hasText: PAGE_TITLE }),
    ).toHaveCount(1);

    // ── REAL media upload: the media-grid item's file input drives the admin
    // media-upload action → Convex storage flow → sharp pass → saveDerivatives.
    // The widget renders the persisted media id once the pipeline resolves. ──
    await fieldControl(page, 'blocks.5.items.0.image', 'input[type="file"]').setInputFiles({
        name: `gate-${RUN_TOKEN}.png`,
        mimeType: 'image/png',
        buffer: TINY_PNG,
    });
    await expect(page.locator('[data-testid="upload-blocks.5.items.0.image-value"]')).not.toBeEmpty({
        timeout: 30_000,
    });

    // ── The 2s interval autosave persists the authored blocks as a draft. ──
    await waitForAutosave(page);

    // The authored content survives a reload (draft round-trip).
    await page.reload();
    await expect(fieldControl(page, 'title', 'input')).toHaveValue(PAGE_TITLE);
    await expect(
        page.locator('[data-testid="blocks-row-blocks"][data-row-index="8"][data-block-type="vendors"]'),
    ).toBeVisible();
    await expect(fieldControl(page, 'blocks.1.title', 'input')).toHaveValue(`Alert ${RUN_TOKEN}`);
    await expect(page.locator('[data-testid="upload-blocks.5.items.0.image-value"]')).not.toBeEmpty();

    // ── Publish via the real toolbar; validation passes (title + slug set). ──
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.locator('[role="alert"]')).toHaveCount(0);

    // The published state survives a reload.
    await page.reload();
    await expect(fieldControl(page, 'title', 'input')).toHaveValue(PAGE_TITLE);
    await expect(page.locator('[data-testid="upload-blocks.5.items.0.image-value"]')).not.toBeEmpty();
});

test('a draft with the required title empty autosaves, but publish fails closed with the error surfaced in the toolbar', async ({
    page,
}) => {
    await page.goto(`/${DOMAIN}/content/pages/new/`);
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/pages/new/\\?locale=`));

    // Only the slug — `title` (server-required for publish) stays empty. The
    // draft autosave must still land: drafts skip required validation.
    await fieldControl(page, 'slug', 'input').fill(`half-${RUN_TOKEN}`);
    await waitForAutosave(page);

    // Publish on the half-finished draft fails closed; the typed Convex
    // rejection surfaces inline in the toolbar instead of crashing the page.
    await page.goto(`/${DOMAIN}/content/pages/`);
    await page.getByText(`half-${RUN_TOKEN}`).first().click();
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/pages/[^/]+/\\?locale=`));
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.locator('[role="alert"]')).toContainText(/required field/i);
});
