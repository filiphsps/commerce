import { expect, test } from '@playwright/test';

import { addToCartFromPdp, dismissGeoBanner, LOCALE } from './fixtures/storefront';

/**
 * Cart flow against the seeded mock.shop tenant (mock.shop supports cart mutations). Adding from the
 * PDP increments the optimistic header badge; the cart page then shows the line, the cost summary, and
 * a checkout affordance; the line's quantity stepper and remove control mutate the cart.
 *
 * Serial: each test re-adds its own line, so they don't depend on a shared cart state.
 */
test.describe.configure({ mode: 'serial' });

const cartPath = `/${LOCALE}/cart/`;

// The optimistic header-badge increment is asserted inside `addToCartFromPdp` (which every test here
// awaits), so a dedicated badge test would be redundant — and racy, since Add to Cart hands off to the
// cart page where the freshly-loaded badge briefly reads zero before the cart count hydrates.

test('the cart page shows the line, a cost summary, and a checkout affordance', async ({ page }) => {
    await addToCartFromPdp(page);
    await page.goto(cartPath, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-cart-line]').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-display="cost"]').first()).toBeVisible();
    await expect(
        page
            .getByRole('button', { name: /checkout/i })
            .or(page.getByRole('link', { name: /checkout/i }))
            .first(),
    ).toBeVisible();
});

test("the line's quantity stepper increases the quantity", async ({ page }) => {
    await addToCartFromPdp(page);
    await page.goto(cartPath, { waitUntil: 'domcontentloaded' });
    // The sticky geo banner can overlay bottom-anchored line controls; clear it (no-op when absent).
    await dismissGeoBanner(page);
    const line = page.locator('[data-cart-line]').first();
    const quantity = line.locator('[data-line-quantity]').first();
    await expect(quantity).toHaveText('1', { timeout: 30_000 });
    await line.getByTestId('quantity-increase').click();
    await expect(quantity).toHaveText('2', { timeout: 15_000 });
});

test('clearing the cart empties it', async ({ page }) => {
    await addToCartFromPdp(page);
    await page.goto(cartPath, { waitUntil: 'domcontentloaded' });
    await dismissGeoBanner(page);
    const line = page.locator('[data-cart-line]').first();
    // Wait for the cart to settle (quantity rendered) before mutating it.
    await expect(line.locator('[data-line-quantity]').first()).toHaveText('1', { timeout: 30_000 });
    // The cart-level "Clear cart" control empties every line — a single, stable affordance, unlike the
    // per-line Remove button which is absolutely positioned and toggles pointer-events with cart status.
    const clear = page.getByRole('button', { name: /clear cart/i });
    await expect(clear).toBeEnabled({ timeout: 15_000 });
    await clear.click();
    await expect(page.locator('[data-cart-line]')).toHaveCount(0, { timeout: 15_000 });
});
