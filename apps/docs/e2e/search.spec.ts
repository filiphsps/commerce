import { expect, test } from '@playwright/test';

test.skip('Cmd+K opens search palette', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
    // The Nextra theme also renders a navbar search combobox; scope the
    // assertion to the cmdk Command.Dialog (Radix uses role="dialog").
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.locator('input').first()).toBeVisible();
});
