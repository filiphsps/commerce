import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read the source file directly to introspect the GraphQL query shape WITHOUT
// importing search.ts, which transitively pulls in @/api/_loaders → RawShop and
// requires MONGODB_URI at module-load time (would explode in unit tests).
// Resolve relative to this file (search.ts is a sibling) so the test is independent
// of the process cwd — a bare `vitest run` from any directory still finds the source.
const searchSource = readFileSync(join(__dirname, 'search.ts'), 'utf8');

describe('SEARCH_PRODUCTS_QUERY — Phase 1 regression', () => {
    it('spreads the ProductMinimal fragment so SearchProductCard sees variants', () => {
        expect(searchSource).toMatch(/\.{3}ProductMinimal/);
        expect(searchSource).toMatch(/PRODUCT_FRAGMENT_MINIMAL/);
    });

    it('imports the shared fragment from product-fragments', () => {
        expect(searchSource).toMatch(/from\s+'@\/api\/shopify\/product-fragments'/);
    });
});
