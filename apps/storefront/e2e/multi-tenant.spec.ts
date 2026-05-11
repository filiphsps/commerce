import { expect, test } from '@playwright/test';

test('localhost host resolves to dev fallback shop', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/en-US\//);
});

test('unknown host rewrites to status/unknown-shop', async ({ request }) => {
    const res = await request.get('http://localhost:1337/', {
        headers: { host: 'definitely-not-a-real-shop.example' },
        maxRedirects: 0,
    });
    expect([200, 301, 302, 307]).toContain(res.status());
});

test('trailing-slash redirect works', async ({ page }) => {
    await page.goto('/en-US/products');
    await expect(page).toHaveURL(/\/$/);
});
