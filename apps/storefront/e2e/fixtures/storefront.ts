import { expect, type Page } from '@playwright/test';

/**
 * Real mock.shop entities the seeded canonical tenant's `commerceProvider.domain` ("mock.shop")
 * serves. The all-products page (`/products/`) and Shopify search return nothing against mock.shop, so
 * specs source products from COLLECTIONS — the reliable product surface — and PDPs by handle.
 */
export const LOCALE = 'en-US';
/** A mock.shop collection handle that lists products. */
export const COLLECTION_HANDLE = 'men';
/** A mock.shop product handle with a real PDP. */
export const PRODUCT_HANDLE = 'sweatpants';
/** A mock.shop blog handle and one of its article handles. */
export const BLOG_HANDLE = 'news';
export const ARTICLE_HANDLE = 'making-liquid';

/** Path to a collection that lists products. */
export const collectionPath = (handle = COLLECTION_HANDLE) => `/${LOCALE}/collections/${handle}/`;
/** Path to a product detail page. */
export const productPath = (handle = PRODUCT_HANDLE) => `/${LOCALE}/products/${handle}/`;

/**
 * Navigates to a collection and waits for its product grid to render. Products stream in via Suspense,
 * so the card root appears after the initial document.
 *
 * @param page - The Playwright page.
 * @param handle - Collection handle; defaults to {@link COLLECTION_HANDLE}.
 * @returns The first product card locator, asserted visible.
 */
export async function gotoCollectionWithProducts(page: Page, handle = COLLECTION_HANDLE) {
    await page.goto(collectionPath(handle), { waitUntil: 'domcontentloaded' });
    const card = page.getByTestId('product-card-root').first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    return card;
}

/**
 * Adds a product to the cart through the canonical PDP flow: opens the product, selects the first size
 * option when the product exposes any, and clicks Add to Cart. (Collection-card quick-add requires an
 * in-card variant choice and is intentionally not the primary add path here.)
 *
 * @param page - The Playwright page.
 * @param handle - Product handle; defaults to a variant-less product that adds cleanly.
 */
export async function addToCartFromPdp(page: Page, handle = 'hoodie-old'): Promise<void> {
    await page.goto(productPath(handle), { waitUntil: 'domcontentloaded' });
    const addToCart = page.getByRole('button', { name: /add to cart/i }).first();
    await expect(addToCart).toBeVisible({ timeout: 30_000 });
    const size = page.locator('button[aria-label^="Size:"]');
    if ((await size.count()) > 0) {
        await size.first().click();
    }
    await addToCart.click();
    // Wait for the cart to register (badge off zero) before returning, so callers that navigate to
    // the cart page don't race the cartLinesAdd round-trip and land on an empty cart. The first add in
    // a worker pays the cart-mutation route's cold compile, hence the generous budget.
    await expect(page.locator('[data-cart-count]').first()).toHaveAttribute('data-cart-count', /[1-9]/, {
        timeout: 45_000,
    });
}

/**
 * Opens a header mega-menu trigger and waits for it to expand, converging regardless of pointer
 * capability and hydration timing. The trigger opens on hover when the pointer is hover-capable and
 * toggles on click otherwise; a one-shot action fired before hydration is also lost. Retry hover →
 * (if still closed) click until `aria-expanded` reads true.
 *
 * @param page - The Playwright page.
 * @param name - Accessible name of the menu trigger button (e.g. `Menu: Shop`).
 * @returns The trigger locator, asserted expanded.
 */
export async function openMegaMenu(page: Page, name: string) {
    const trigger = page.getByRole('button', { name });
    await expect(trigger).toBeVisible({ timeout: 30_000 });
    await expect(async () => {
        await trigger.hover();
        if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
            await trigger.click();
        }
        await expect(trigger).toHaveAttribute('aria-expanded', 'true', { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    return trigger;
}

/**
 * Dismisses the geo-redirect banner if present. The banner is a sticky bottom element shown only when
 * IP geolocation resolves a country different from the active locale's (and the network lookup
 * succeeds — it is absent when the lookup is blocked, e.g. in CI), so its presence is environment
 * dependent and specs must not depend on it. Clears it so it can't overlap bottom-anchored UI.
 *
 * @param page - The Playwright page.
 */
export async function dismissGeoBanner(page: Page): Promise<void> {
    const close = page.getByRole('button', { name: 'Close' });
    if (await close.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await close.click().catch(() => {});
    }
}
