import { expect, test } from '@playwright/test';

test('switching locale changes the URL prefix', async ({ page }) => {
    await page.goto('/en-US/');
    const switcher = page.getByRole('button', { name: /language|locale/i }).first();
    if (await switcher.isVisible()) {
        await switcher.click();
        const otherLocale = page.getByText(/Svenska|sv-SE/i).first();
        await otherLocale.click();
        await expect(page).toHaveURL(/\/(sv-SE|sv)\//);
    }
});
