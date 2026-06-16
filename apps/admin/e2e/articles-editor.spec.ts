import { expect, test } from '@playwright/test';

import { DOMAIN, fieldControl, fillRichText, waitForAutosave } from './fixtures/editor';

/**
 * The articles editor flow end to end through the REAL admin app: creation on `/new/` (the first
 * diverged autosave tick creates the document and BINDS it — the toolbar shallow-replaces the URL with
 * the edit route), the required fields (title/slug/author), localized excerpt + ProseMirror body, the
 * 2s autosave, a reload round-trip, publish, and the new article showing on the list route.
 *
 * Runs serial; a per-run token keeps assertions honest against the shared deployment.
 */
test.describe.configure({ mode: 'serial' });

/** Unique per-run marker so assertions never pass on a previous run's data. */
const RUN_TOKEN = `e2e-${Date.now()}`;
const TITLE = `Gate article ${RUN_TOKEN}`;
const SLUG = `gate-article-${RUN_TOKEN}`;
/** The authored body text for the localized rich-text field. */
const BODY = `Body ${RUN_TOKEN}`;

test('creates an article on /new/, binds + autosaves, reloads, publishes, and lists it', async ({ page }) => {
    await page.goto(`/${DOMAIN}/content/articles/new/`);
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/articles/new/\\?locale=`));

    // Required fields — the create binding needs them set before publish.
    await fieldControl(page, 'title', 'input').fill(TITLE);
    await fieldControl(page, 'slug', 'input').fill(SLUG);
    await fieldControl(page, 'author', 'input').fill(`Author ${RUN_TOKEN}`);
    await waitForAutosave(page);

    // The bound create swapped the URL onto the edit route without remounting.
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/articles/(?!new/)[^/]+/\\?locale=`));

    // A real navigation onto the edit route proves exactly ONE document came out of the /new/
    // autosaves and refreshes the form from the persisted draft.
    await page.reload();
    await expect(fieldControl(page, 'title', 'input')).toHaveValue(TITLE);
    await expect(fieldControl(page, 'author', 'input')).toHaveValue(`Author ${RUN_TOKEN}`);

    // Localized body + excerpt.
    await fieldControl(page, 'excerpt', 'textarea').fill(`Excerpt ${RUN_TOKEN}`);
    await fillRichText(page, 'body', BODY);
    await waitForAutosave(page);
    await page.reload();
    await expect(fieldControl(page, 'excerpt', 'textarea')).toHaveValue(`Excerpt ${RUN_TOKEN}`);
    // The authored prose round-trips: the editor re-renders the persisted ProseMirror body as text.
    await expect(page.locator('[data-testid="field-body"] [contenteditable="true"]').first()).toContainText(BODY, {
        timeout: 15_000,
    });

    // Publish; validation passes (title + slug + author set).
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByTestId('editor-toolbar-error')).toHaveCount(0);
    await expect(page.getByText(/Last saved/)).toBeVisible({ timeout: 15_000 });

    // The article appears on the list route.
    await page.goto(`/${DOMAIN}/content/articles/`);
    await expect(page.getByText(TITLE).first()).toBeVisible({ timeout: 15_000 });
});

test('a draft with the required title empty autosaves, but publish fails closed with the error surfaced', async ({
    page,
}) => {
    await page.goto(`/${DOMAIN}/content/articles/new/`);
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/articles/new/\\?locale=`));

    // Only the slug — `title`/`author` (server-required for publish) stay empty. The draft autosave
    // must still land: drafts skip required validation.
    await fieldControl(page, 'slug', 'input').fill(`half-${RUN_TOKEN}`);
    await waitForAutosave(page);

    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/articles/(?!new/)[^/]+/\\?locale=`));
    await page.getByRole('button', { name: 'Publish' }).click();
    // Fails CLOSED: the publish surfaces an error inline in the toolbar instead of crashing the page.
    await expect(page.getByTestId('editor-toolbar-error')).toBeVisible();
});
