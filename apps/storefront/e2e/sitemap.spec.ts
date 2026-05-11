import { expect, test } from '@playwright/test';

test('GET /sitemap.xml returns 200 and valid XML', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/xml/);
    const body = await res.text();
    expect(body).toContain('<sitemapindex');
});

test('GET /robots.txt includes a Sitemap directive', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Sitemap:\s*https?:\/\//);
});
