import { expect, test } from '@playwright/test';

test('search results page renders for a non-empty query', async ({ page }) => {
    await page.goto('/en-US/search/?q=test');
    await expect(page).toHaveURL(/q=test/);
});

test('search handles empty query gracefully', async ({ page }) => {
    const res = await page.goto('/en-US/search/');
    expect(res?.status()).toBeLessThan(500);
});

test('no-query search renders the landing state instead of a blank page', async ({ page }) => {
    await page.goto('/en-US/search/');
    // The landing is sourced from the `search` singleton with a platform-default fallback; an unseeded
    // tenant shows the default heading + popular-search chips rather than the old blank `empty:hidden`.
    await expect(page.getByRole('heading', { name: /search our store/i })).toBeVisible({ timeout: 30_000 });
});

test('a popular-search chip runs that query', async ({ page }) => {
    await page.goto('/en-US/search/');
    const chip = page.getByRole('button', { name: 'Sale' });
    await expect(chip).toBeVisible({ timeout: 30_000 });
    await chip.click();
    await expect(page).toHaveURL(/q=Sale/);
});
