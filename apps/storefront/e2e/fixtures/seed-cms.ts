import { InvalidShopError, MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import { seedCanonical } from '@nordcom/commerce-test-convex';

/**
 * Options for {@link seedCms}. E2E specs predate the shop==tenant unification and pass the value
 * exported by `global-setup.ts` (`E2E_TENANT_ID`, the canonical `shops` document id) under the
 * legacy `tenantId` key.
 */
export interface SeedCmsOptions {
    tenantId: string;
}

/**
 * Per-spec CMS reset: re-ensures the canonical Convex corpus before content-asserting specs. The
 * canonical seed is idempotent and the storefront suite never mutates CMS content, so "ensure" and
 * "reset" coincide — on an already-seeded deployment this is a single `byDomain` probe. The Mongo
 * side the dual-read getters still serve is seeded (with the same content, pinned by the SFREAD-01
 * goldens) by the `pnpm dev` daemon machinery, not from here.
 *
 * @param opts - `{ tenantId }` — the shop document id exported by global setup; verified against
 *   the id the seed resolves so a drifted environment fails loud instead of asserting on the wrong
 *   tenant's content.
 * @throws {MissingEnvironmentVariableError} When `CONVEX_URL` is unset (`global-setup.ts` ran?).
 * @throws {InvalidShopError} When `tenantId` does not match the canonical seeded shop.
 */
export async function seedCms({ tenantId }: SeedCmsOptions): Promise<void> {
    const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
        throw new MissingEnvironmentVariableError('CONVEX_URL', 'Run via `pnpm test:e2e` so root .env.local loads.');
    }

    const shopId = await seedCanonical(url);
    if (shopId !== tenantId) {
        throw new InvalidShopError(
            `[seed-cms] E2E_TENANT_ID "${tenantId}" does not match the canonical seeded shop "${shopId}".`,
        );
    }
}
