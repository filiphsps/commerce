import { expect, type Page } from '@playwright/test';

/**
 * The seeded canonical tenant (e2e/global-setup.ts), defaulted by playwright.config.ts. CI/staging
 * may override via `E2E_SHOP_DOMAIN`.
 */
export const DOMAIN = process.env.E2E_SHOP_DOMAIN ?? 'nordcom-demo-shop.com';

/** The toolbar's autosave cadence (EditorFormToolbar `autosave.interval`). */
export const AUTOSAVE_INTERVAL_MS = 2_000;

/**
 * Locator for the control inside the native field shell at a dotted form-state path.
 *
 * @param page - The Playwright page.
 * @param path - The field's dotted form-state path (e.g. `legalName`, `address.city`, `profiles.0.url`).
 * @param control - The control selector inside the shell (`input`, `textarea`, `select`).
 * @returns The control locator.
 */
export const fieldControl = (page: Page, path: string, control: string) =>
    page.locator(`[data-testid="field-${path}"] ${control}`);

/**
 * Adds one row to the array widget at a dotted path through its real add control.
 *
 * @param page - The Playwright page.
 * @param path - The array field's dotted path (e.g. `profiles`, `sections.0.links`).
 */
export async function addArrayRow(page: Page, path: string): Promise<void> {
    await page.locator(`[data-testid="array-add-${path}"]`).first().click();
}

/**
 * Adds one block row of `type` through the blocks widget's real picker + add control.
 *
 * @param page - The Playwright page.
 * @param path - The blocks field's dotted path (e.g. `blocks`).
 * @param type - The block type slug to add.
 */
export async function addBlock(page: Page, path: string, type: string): Promise<void> {
    await page.locator(`[data-testid="blocks-picker-${path}"]`).selectOption(type);
    await page.locator(`[data-testid="blocks-add-${path}"]`).click();
}

/**
 * Authors plain text into the WYSIWYG rich-text editor at a dotted path, replacing any existing
 * content. Drives the REAL Tiptap surface (the `contenteditable` inside the field shell) the way a
 * person does — focus, select-all, delete, then type — so ProseMirror's input handling produces the
 * document the field persists. Use this anywhere the old JSON-textarea fallback was filled directly.
 *
 * @param page - The Playwright page.
 * @param path - The rich-text field's dotted form-state path (e.g. `body`, `blocks.7.body`).
 * @param text - The plain-text body to author.
 */
export async function fillRichText(page: Page, path: string, text: string): Promise<void> {
    const editor = page.locator(`[data-testid="field-${path}"] [contenteditable="true"]`).first();
    await editor.click();
    await editor.press('ControlOrMeta+a');
    await editor.press('Delete');
    await editor.pressSequentially(text);
}

/**
 * Waits for the interval autosave to QUIESCE — every pending edit round-tripped.
 *
 * "Last saved" is sticky: the toolbar sets it on the first tick and never clears it, so a bare
 * `getByText(/Last saved/)` check races the 2s clock and returns on an EARLIER tick — before the
 * latest edit (or, on a create-and-bind route, the create) has been posted. The loop exposes no
 * per-edit completion signal, so poll until "Saving…" stays absent across a full interval: no tick
 * finding divergence means the form is clean and every edit is durable.
 *
 * @param page - The Playwright page.
 */
export async function waitForAutosave(page: Page): Promise<void> {
    await expect(async () => {
        await expect(page.getByText('Saving…')).toBeHidden();
        await page.waitForTimeout(AUTOSAVE_INTERVAL_MS + 300);
        await expect(page.getByText('Saving…')).toBeHidden();
    }).toPass({ timeout: 30_000 });
    await expect(page.getByText(/Last saved/)).toBeVisible({ timeout: 15_000 });
}
