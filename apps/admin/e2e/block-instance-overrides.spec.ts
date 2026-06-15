import { expect, test } from '@playwright/test';

import { addBlock, DOMAIN, fieldControl, waitForAutosave } from './fixtures/editor';

/**
 * The per-instance override flow through the REAL admin app: a collection block placed on a page
 * carries an Overrides group rendering the block's store-wide `settings` (its `defaultLayout`) as
 * inherit/override fields written to the block node. Overriding it on this one block sets the bottom
 * tier of the cascade (instance → store default → platform). The spec authors a fresh page (unique
 * slug) so it never collides with prior runs.
 */
test.describe.configure({ mode: 'serial' });

const RUN_TOKEN = `e2e-ovr-${Date.now()}`;

test('a collection block overrides its default layout per instance', async ({ page }) => {
    // Create-and-bind on /new/: fill the required fields, let autosave create the doc and redirect.
    await page.goto(`/${DOMAIN}/content/pages/new/`);
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/pages/new/\\?locale=`));
    await fieldControl(page, 'title', 'input').fill(`Override page ${RUN_TOKEN}`);
    await fieldControl(page, 'slug', 'input').fill(`override-page-${RUN_TOKEN}`);
    await waitForAutosave(page);
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/pages/(?!new/)[^/]+/\\?locale=`));

    // Add a collection block and give it a real seeded handle.
    await addBlock(page, 'blocks', 'collection');
    await fieldControl(page, 'blocks.0.handle', 'input').fill('men');

    // The block exposes an Overrides group; override the per-instance default layout.
    await expect(page.getByTestId('blocks-settings-blocks-0')).toBeVisible();
    const layoutPath = 'blocks.0.defaultLayout';
    await page.getByTestId(`override-override-${layoutPath}`).click();
    await fieldControl(page, layoutPath, 'select').selectOption('grid');

    await waitForAutosave(page);

    // Reload → the per-instance override persisted on the block node.
    await page.reload();
    await expect(page.getByTestId(`override-override-${layoutPath}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(fieldControl(page, layoutPath, 'select')).toHaveValue('grid');
});
