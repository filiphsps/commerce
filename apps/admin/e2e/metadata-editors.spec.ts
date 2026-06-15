import { expect, test } from '@playwright/test';

import { addBlock, DOMAIN, fieldControl, waitForAutosave } from './fixtures/editor';

/**
 * The product- and collection-metadata editor flows end to end through the REAL admin app. Both are
 * keyed by a Shopify handle (keyField addressing): the list route's handle form opens the editor for a
 * handle, the editor auto-binds on first autosave, a localized ProseMirror `descriptionOverride` and a
 * block are authored, the draft round-trips through a reload, and publish succeeds with the required
 * `shopifyHandle` set.
 *
 * The handles match real mock.shop entities (product `sweatpants`, collection `men`) so the override
 * is meaningful, but the admin editor treats them as opaque keys.
 */
test.describe.configure({ mode: 'serial' });

/** Unique per-run marker so assertions never pass on a previous run's data. */
const RUN_TOKEN = `e2e-${Date.now()}`;

/** The authored ProseMirror document for the localized JSON description-override field. */
const pmDoc = (label: string) =>
    JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: `${label} ${RUN_TOKEN}` }] }],
    });

/**
 * Drives one metadata editor: opens the handle through the list form, authors the override + a block,
 * autosaves, reloads, and publishes.
 *
 * @param page - The Playwright page.
 * @param kind - `product` or `collection` — selects the route segment.
 * @param handle - The Shopify handle keying the metadata document.
 */
async function runMetadataEditor(
    page: import('@playwright/test').Page,
    kind: 'product' | 'collection',
    handle: string,
): Promise<void> {
    const segment = `${kind}-metadata`;
    await page.goto(`/${DOMAIN}/content/${segment}/`);

    // The list route's handle form opens (or creates) the editor for a handle.
    await page.getByLabel('Shopify handle').fill(handle);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/${segment}/${handle}/`));

    // `shopifyHandle` is required for publish; ensure it carries the route handle (fill if the editor
    // didn't pre-key it from the route).
    const handleField = fieldControl(page, 'shopifyHandle', 'input');
    await expect(handleField).toBeVisible({ timeout: 15_000 });
    if ((await handleField.inputValue()) !== handle) {
        await handleField.fill(handle);
    }

    await fieldControl(page, 'descriptionOverride', 'textarea').fill(pmDoc(kind));
    if ((await page.locator('[data-testid="blocks-row-blocks"]').count()) === 0) {
        await addBlock(page, 'blocks', 'rich-text');
    }
    await waitForAutosave(page);

    await page.reload();
    await expect(fieldControl(page, 'descriptionOverride', 'textarea')).toHaveValue(pmDoc(kind));

    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByTestId('editor-toolbar-error')).toHaveCount(0);
    await expect(page.getByText(/Last saved/)).toBeVisible({ timeout: 15_000 });
}

test('product-metadata: opens a handle, authors an override + block, autosaves, and publishes', async ({ page }) => {
    await runMetadataEditor(page, 'product', 'sweatpants');
});

test('collection-metadata: opens a handle, authors an override + block, autosaves, and publishes', async ({ page }) => {
    await runMetadataEditor(page, 'collection', 'men');
});
