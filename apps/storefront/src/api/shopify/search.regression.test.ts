import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Read the source file directly to introspect the GraphQL query shape WITHOUT
// importing search.ts, which transitively pulls in @/api/_loaders → RawShop and
// requires MONGODB_URI at module-load time (would explode in unit tests).
const searchSource = readFileSync(
    join(process.cwd(), 'apps/storefront/src/api/shopify/search.ts'),
    'utf8',
);

describe('SEARCH_PRODUCTS_QUERY — Phase 1 regression', () => {
    it('spreads the ProductMinimal fragment so SearchProductCard sees variants', () => {
        expect(searchSource).toMatch(/\.{3}ProductMinimal/);
        expect(searchSource).toMatch(/PRODUCT_FRAGMENT_MINIMAL/);
    });

    it('imports the shared fragment from product-fragments', () => {
        expect(searchSource).toMatch(/from\s+'@\/api\/shopify\/product-fragments'/);
    });
});
