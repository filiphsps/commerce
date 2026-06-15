import { expect, test } from '@playwright/test';

import { addToCartFromPdp, dismissGeoBanner, LOCALE } from './fixtures/storefront';

/**
 * Checkout initiation against the seeded mock.shop tenant: with a line in the cart, activating the
 * cart's checkout affordance hands off to the Shopify-hosted checkout URL (mock.shop serves a real
 * `checkoutUrl` on `demostore.mock.shop`).
 */
test('checkout hands off to the Shopify-hosted checkout URL', async ({ page }) => {
    await addToCartFromPdp(page);
    await page.goto(`/${LOCALE}/cart/`, { waitUntil: 'domcontentloaded' });
    // The sticky geo banner can overlay the bottom-anchored checkout control; clear it (no-op when absent).
    await dismissGeoBanner(page);

    const checkout = page
        .getByRole('link', { name: /checkout/i })
        .or(page.getByRole('button', { name: /checkout/i }))
        .first();
    await expect(checkout).toBeVisible({ timeout: 30_000 });

    const handoff = page.waitForRequest(/checkout|mock\.shop|myshopify|shopify/i, { timeout: 30_000 });
    await checkout.click();
    const request = await handoff;
    expect(request.url()).toMatch(/checkout|mock\.shop|myshopify|shopify/i);
});
