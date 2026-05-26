import { expect, test } from '@playwright/test';

test('search results render a product card per result', async ({ page }) => {
    await page.goto('/en-US/search/?q=t-shirt');

    // Wait for the result count label to confirm the response landed.
    const countLabel = page.getByText(/\d+ products?/i);
    await expect(countLabel).toBeVisible();

    const countText = await countLabel.textContent();
    const expected = Number(countText?.match(/(\d+)/)?.[1] ?? 0);
    expect(expected).toBeGreaterThan(0);

    const cards = page.getByTestId('product-card-root');
    await expect(cards).toHaveCount(expected);
});
