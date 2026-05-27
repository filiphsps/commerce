import { mockProduct } from './product';

/**
 * Builds a minimal Shopify collection fixture for use in tests.
 *
 * @param overrides - Properties merged onto the base collection fixture.
 * @returns A plain object shaped like a Shopify Collection GraphQL response node.
 */
export function mockCollection(overrides: Record<string, unknown> = {}) {
    return {
        id: 'gid://shopify/Collection/1',
        handle: 'demo-collection',
        title: 'Demo Collection',
        descriptionHtml: '<p>Collection description.</p>',
        products: {
            nodes: [mockProduct()],
            pageInfo: { hasNextPage: false, endCursor: null },
        },
        ...overrides,
    };
}
