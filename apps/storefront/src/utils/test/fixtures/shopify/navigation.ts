/**
 * Builds a minimal Shopify navigation menu fixture for use in tests.
 *
 * @param overrides - Properties merged onto the base menu fixture.
 * @returns A plain object shaped like a Shopify Menu GraphQL response node.
 */
export function mockNavigation(overrides: Record<string, unknown> = {}) {
    return {
        id: 'gid://shopify/Menu/1',
        handle: 'main-menu',
        title: 'Main Menu',
        items: [
            { id: 'gid://shopify/MenuItem/1', title: 'Home', url: '/', items: [] },
            { id: 'gid://shopify/MenuItem/2', title: 'Shop', url: '/collections/all/', items: [] },
        ],
        ...overrides,
    };
}
