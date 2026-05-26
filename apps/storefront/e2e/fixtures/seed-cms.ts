import { seedCms as pkgSeedCms } from '@nordcom/commerce-test-mongo';

/**
 * Per-spec CMS reset wrapper. The package helper takes the source Shop's
 * `_id` (which Payload's multi-tenant plugin then resolves to the Tenant
 * doc internally). E2E specs predate that rename and pass it under the
 * legacy `tenantId` key — `global-setup.ts` populates `E2E_TENANT_ID` with
 * the same shop `_id`, so this shim is a pure name translation.
 *
 * @param opts - `{ tenantId }` — accepts the shop `_id` exported by global setup.
 * @throws If `MONGODB_URI` is unset (`global-setup.ts` must run first).
 */
export interface SeedCmsOptions {
    tenantId: string;
}

export async function seedCms(opts: SeedCmsOptions): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('[seed-cms] MONGODB_URI not set; globalSetup must run first');
    await pkgSeedCms(uri, { shopId: opts.tenantId });
}
