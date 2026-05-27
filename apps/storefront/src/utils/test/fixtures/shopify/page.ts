/**
 * Builds a minimal Shopify page fixture for use in tests.
 *
 * @param overrides - Properties merged onto the base page fixture.
 * @returns A plain object shaped like a Shopify Page GraphQL response node.
 */
export function mockPage(overrides: Record<string, unknown> = {}) {
    return {
        id: 'gid://shopify/Page/1',
        handle: 'demo-page',
        title: 'Demo Page',
        body: '<p>Page body.</p>',
        bodySummary: 'Page body.',
        seo: { title: 'Demo Page', description: 'Demo description.' },
        ...overrides,
    };
}
