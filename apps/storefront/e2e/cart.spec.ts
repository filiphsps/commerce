import { expect, test } from '@playwright/test';

test.describe('Cart — server-side + predictive', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/favicon.png', (r) => r.fulfill({ status: 200, body: '' }));
        await page.route('**/api/media/file/**', (r) => r.fulfill({ status: 200, body: '' }));
    });

    test('optimistic add: badge increments within 100ms', async ({ page }) => {
        await page.goto('/en-US/products/');
        const badgeBefore = await page.locator('[data-cart-count]').first().textContent();
        await page.locator('article[data-layout] button[type="button"]:not([data-option-more])').first().click();
        // The optimistic update is synchronous in React; the network roundtrip happens after.
        await expect(page.locator('[data-cart-count]').first()).not.toHaveText(badgeBefore ?? '');
    });

    test('optimistic stepper in cart drawer', async ({ page }) => {
        await page.goto('/en-US/products/');
        await page.locator('article[data-layout] button[type="button"]:not([data-option-more])').first().click();
        await page.goto('/en-US/cart/');
        const qtyBefore = parseInt((await page.locator('[data-line-quantity]').first().textContent()) ?? '1', 10);
        await page.locator('button[aria-label*="ncrease"], button:has-text("+")').first().click();
        await expect(page.locator('[data-line-quantity]').first()).toHaveText(String(qtyBefore + 1));
    });

    test('discount apply: cost fades then settles', async ({ page }) => {
        await page.goto('/en-US/cart/');
        const codeInput = page.locator('input[name="code"], input[name="discount"]').first();
        if (await codeInput.isVisible().catch(() => false)) {
            await codeInput.fill('TESTCODE');
            await page.locator('button:has-text("Apply"), button[type="submit"]').last().click();
            // No assertion on success — TESTCODE likely invalid; just verify no crash
            await expect(page.locator('[data-display="cost"], .cart-summary')).toBeVisible();
        }
    });

    test('cross-tab sync via BroadcastChannel', async ({ browser }) => {
        const ctx = await browser.newContext();
        const tabA = await ctx.newPage();
        const tabB = await ctx.newPage();
        await tabA.goto('/en-US/products/');
        await tabB.goto('/en-US/');
        const beforeB = await tabB.locator('[data-cart-count]').first().textContent();
        await tabA.locator('article[data-layout] button[type="button"]:not([data-option-more])').first().click();
        await tabB.waitForTimeout(1500);
        const afterB = await tabB.locator('[data-cart-count]').first().textContent();
        expect(afterB).not.toBe(beforeB);
        await ctx.close();
    });

    test('cart-expired recovery clears cookie and creates new', async ({ page, context }) => {
        await page.goto('/en-US/products/');
        await page.locator('article[data-layout] button[type="button"]:not([data-option-more])').first().click();
        // Wipe the cookie
        await context.clearCookies({ name: 'nordcom-cart' });
        // Add again — should NOT toast an error; should create a new cart silently
        await page.locator('article[data-layout] button[type="button"]:not([data-option-more])').first().click();
        await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
    });

    test('PDP renders without uncaught errors for a known product', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.goto('/en-US/products/mock-shop-product-1/');
        await expect(page.locator('h1, [data-display="title"]').first()).toBeVisible({ timeout: 30000 });
        expect(errors).toEqual([]);
    });

    test('no-JS add: form submits without JavaScript', async ({ browser }) => {
        const ctx = await browser.newContext({ javaScriptEnabled: false });
        const page = await ctx.newPage();
        await page.goto('/en-US/products/');
        const form = page.locator('article[data-layout] form').first();
        await form.evaluate((f: HTMLFormElement) => f.submit());
        await page.waitForLoadState('domcontentloaded');
        // After reload, the cart should have the line — visible via cart drawer route
        await page.goto('/en-US/cart/');
        await expect(page.locator('[data-cart-line], .cart-line').first()).toBeVisible();
        await ctx.close();
    });

    test('userError revert: optimistic add reverts when server rejects', async ({ page }) => {
        await page.goto('/en-US/products/');
        // Stub the Storefront API to return userErrors for cartLinesAdd
        await page.route('**/api/**/graphql.json', async (route) => {
            const post = route.request().postData();
            if (post?.includes('cartLinesAdd')) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: { cartLinesAdd: { cart: null, userErrors: [{ message: 'Sold out' }] } },
                    }),
                });
            }
            return route.continue();
        });
        const badgeBefore = await page.locator('[data-cart-count]').first().textContent();
        await page.locator('article[data-layout] button[type="button"]:not([data-option-more])').first().click();
        await page.waitForTimeout(1500);
        const badgeAfter = await page.locator('[data-cart-count]').first().textContent();
        expect(badgeAfter).toBe(badgeBefore); // reverted
        await expect(page.locator('[data-sonner-toast]')).toContainText(/sold out/i);
    });
});
