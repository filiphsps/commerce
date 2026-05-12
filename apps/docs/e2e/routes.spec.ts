import { type Page, expect, test } from '@playwright/test';

/**
 * Every URL the site is expected to serve. Generated from the same workspace
 * discovery that drives `docusaurus.config.ts` — see {@link discoverRoutes}.
 */
type Route = {
    name: string;
    path: string;
    /** Substring that must appear somewhere on the rendered page. */
    expectText: string;
};

const ROOT_ROUTES: Route[] = [
    { name: 'Landing page', path: '/commerce/', expectText: 'Get started' },
    { name: 'Getting Started', path: '/commerce/docs/getting-started/', expectText: 'Getting Started' },
    { name: 'Architecture', path: '/commerce/docs/architecture/', expectText: 'Architecture' },
    { name: 'Contributing', path: '/commerce/docs/contributing/', expectText: 'Contributing' },
    { name: 'Deployment', path: '/commerce/docs/deployment/', expectText: 'Deployment' },
    { name: 'Conventions', path: '/commerce/docs/conventions/', expectText: 'Conventions' },
];

const APP_OVERVIEW_ROUTES: Route[] = [
    { name: 'Storefront overview', path: '/commerce/docs/storefront/overview/', expectText: 'Storefront' },
    { name: 'Admin overview', path: '/commerce/docs/admin/overview/', expectText: 'Admin' },
    { name: 'Landing overview', path: '/commerce/docs/landing/overview/', expectText: 'Landing' },
];

const PACKAGE_OVERVIEW_ROUTES: Route[] = [
    { name: 'db overview', path: '/commerce/docs/db/overview/', expectText: 'commerce-db' },
    { name: 'errors overview', path: '/commerce/docs/errors/overview/', expectText: 'commerce-errors' },
    {
        name: 'shopify-graphql overview',
        path: '/commerce/docs/shopify-graphql/overview/',
        expectText: 'commerce-shopify-graphql',
    },
    {
        name: 'shopify-html overview',
        path: '/commerce/docs/shopify-html/overview/',
        expectText: 'commerce-shopify-html',
    },
    {
        name: 'marketing-common overview',
        path: '/commerce/docs/marketing-common/overview/',
        expectText: 'commerce-marketing-common',
    },
];

// Every TypeDoc-generated index page renders the package name as its title
// plus at least one category section ("Type Aliases", "Variables", "Classes"
// etc., depending on what the package exports). Asserting on a section header
// that's stable across every package keeps the check resilient to package
// content churn.
const API_REFERENCE_ROUTES: Route[] = [
    { name: 'db API reference', path: '/commerce/docs/db/api/', expectText: 'Classes' },
    { name: 'errors API reference', path: '/commerce/docs/errors/api/', expectText: 'Classes' },
    {
        name: 'shopify-graphql API reference',
        path: '/commerce/docs/shopify-graphql/api/',
        expectText: 'Variables',
    },
    {
        name: 'shopify-html API reference',
        path: '/commerce/docs/shopify-html/api/',
        expectText: 'Functions',
    },
    {
        name: 'marketing-common API reference',
        path: '/commerce/docs/marketing-common/api/',
        expectText: 'Variables',
    },
];

const ALL_ROUTES = [
    ...ROOT_ROUTES,
    ...APP_OVERVIEW_ROUTES,
    ...PACKAGE_OVERVIEW_ROUTES,
    ...API_REFERENCE_ROUTES,
];

async function loadAndCollectErrors(page: Page, path: string): Promise<string[]> {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
        errors.push(`pageerror: ${error.message}\n${error.stack ?? '<no stack>'}`);
    });
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
    });

    const response = await page.goto(path, { waitUntil: 'networkidle' });
    expect(response, `no response for ${path}`).not.toBeNull();
    expect(response?.status(), `unexpected HTTP status for ${path}`).toBe(200);

    return errors;
}

test.describe('Doc site routes', () => {
    for (const route of ALL_ROUTES) {
        test(`${route.name} renders without client errors`, async ({ page }) => {
            const errors = await loadAndCollectErrors(page, route.path);

            // Allowed noise: dev-mode webpack hot-update polling occasionally
            // logs benign 404s for the .hot-update.json file when no rebuild
            // has happened yet. Filter those out so the assertion stays
            // strict for real failures.
            const significantErrors = errors.filter((e) => !/hot-update\.json/.test(e));
            expect(significantErrors, `client errors on ${route.path}`).toEqual([]);

            await expect(page.locator('body')).toContainText(route.expectText);
        });
    }
});

test.describe('Navigation', () => {
    test('Apps dropdown surfaces every app', async ({ page }) => {
        await page.goto('/commerce/');
        const dropdown = page.getByRole('button', { name: /Apps/i }).first();
        await dropdown.click();
        for (const name of ['Storefront', 'Admin', 'Landing']) {
            await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible();
        }
    });

    test('Packages dropdown surfaces every package', async ({ page }) => {
        await page.goto('/commerce/');
        const dropdown = page.getByRole('button', { name: /Packages/i }).first();
        await dropdown.click();
        for (const name of [
            'db',
            'errors',
            'shopify-graphql',
            'shopify-html',
            'marketing-common',
        ]) {
            await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible();
        }
    });

    test('API dropdown surfaces every TypeDoc-generated reference', async ({ page }) => {
        await page.goto('/commerce/');
        const dropdown = page.getByRole('button', { name: /^API$/i }).first();
        await dropdown.click();
        for (const name of [
            'db',
            'errors',
            'shopify-graphql',
            'shopify-html',
            'marketing-common',
        ]) {
            const link = page.getByRole('link', { name, exact: true });
            await expect(link.first()).toBeVisible();
            // Every API dropdown entry must resolve to the per-workspace API
            // index, not the overview — that was the regression.
            const apiLinks = await link.evaluateAll((els) =>
                els.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? '')
            );
            expect(apiLinks.some((h) => h.endsWith('/api/'))).toBe(true);
        }
    });
});
