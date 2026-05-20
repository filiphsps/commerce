// apps/docs/e2e/search.spec.ts
import { expect, test } from '@playwright/test';

test('Cmd+K opens search palette', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible({ timeout: 5_000 });
});
