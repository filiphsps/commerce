import { expect, test } from '@playwright/test';

import { DOMAIN, fieldControl, waitForAutosave } from './fixtures/editor';

/**
 * The CMS image picker flow end to end through the REAL admin app: on a freshly bound article the
 * `cover` upload field opens the Shopify-style media dialog, uploads a new image, edits its alt text
 * and focal point in the detail pane, saves the metadata, commits the image to the field, and proves
 * the selection survives an autosave + reload round-trip.
 *
 * Runs serial; a per-run token keeps assertions honest against the shared deployment.
 */
test.describe.configure({ mode: 'serial' });

/** Unique per-run marker so assertions never pass on a previous run's data. */
const RUN_TOKEN = `e2e-${Date.now()}`;
const TITLE = `Picker article ${RUN_TOKEN}`;
const SLUG = `picker-article-${RUN_TOKEN}`;
const ALT = `Cover alt ${RUN_TOKEN}`;

/** A real 64×64 PNG (sharp-decodable) so the upload exercises the live derivative pipeline. */
const PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAnklEQVRoge2SUQkAQBSDlsb+gRbmQtyHPBgYwMlSOE10g24AesXuQtwlukE3AL1idyHuEt2gG4BesbsQd4lu0A1Ar9hdiLtEN+gGoFfsLsRdoht0A9ArdhfiLtENugHoFbsLcZfoBt0A9IrdhbhLdINuAHrF7kLcJbpBNwC9Ynch7hLdoBuAXrG7EHeJbtANQK/YXYi7RDfoBqBX/OEBuRuBD+yAUDcAAAAASUVORK5CYII=';

test('uploads, edits metadata, and commits an image through the cover picker, surviving a reload', async ({ page }) => {
    // Create + bind the article so the cover write has a document to autosave into.
    await page.goto(`/${DOMAIN}/content/articles/new/`);
    await fieldControl(page, 'title', 'input').fill(TITLE);
    await fieldControl(page, 'slug', 'input').fill(SLUG);
    await fieldControl(page, 'author', 'input').fill(`Author ${RUN_TOKEN}`);
    await waitForAutosave(page);
    await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/content/articles/(?!new/)[^/]+/\\?locale=`));

    // Open the cover field's media picker.
    await page.getByTestId('media-picker-open-cover').click();
    await expect(page.getByTestId('media-picker-cover')).toBeVisible();

    // Upload a new image straight onto the hidden file input — the live create + sharp pipeline runs.
    await page.getByTestId('media-upload-input-cover').setInputFiles({
        name: `cover-${RUN_TOKEN}.png`,
        mimeType: 'image/png',
        buffer: Buffer.from(PNG_BASE64, 'base64'),
    });

    // The upload auto-selects the new image, so the detail pane (focal preview + alt) appears.
    await expect(page.getByTestId('media-focal-cover')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-testid^="media-tile-"]').first()).toBeVisible();

    // Edit the alt text and nudge the focal point, then save the metadata.
    await page.locator('#media-detail-alt').fill(ALT);
    await page.locator('#media-detail-focal-x').fill('0.25');
    await page.getByTestId('media-save-cover').click();
    await expect(page.getByTestId('media-save-cover')).toBeEnabled({ timeout: 30_000 });
    await expect(page.locator('#media-detail-alt')).toHaveValue(ALT);

    // Commit the image to the field; the dialog closes and the field shows the selection.
    await page.getByTestId('media-use-cover').click();
    await expect(page.getByTestId('media-picker-cover')).toBeHidden();
    await expect(page.getByTestId('upload-cover-value')).toBeVisible();

    // The cover id survives the autosave + a real reload of the edit route.
    await waitForAutosave(page);
    await page.reload();
    await expect(page.getByTestId('upload-cover-value')).toBeVisible({ timeout: 15_000 });

    // Deselect: clearing the field drops the selection back to "no image", and that survives a reload.
    await page.getByTestId('media-clear-cover').click();
    await expect(page.getByTestId('upload-cover-value')).toBeHidden();
    await expect(page.getByText('No image selected')).toBeVisible();
    await waitForAutosave(page);
    await page.reload();
    await expect(page.getByTestId('upload-cover-value')).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText('No image selected')).toBeVisible();
});
