import { seedCms as pkgSeedCms, type SeedCmsOptions } from '@nordcom/commerce-test-mongo';

export type { SeedCmsOptions };

/**
 * Per-spec CMS reset wrapper. The package helper takes the URI explicitly;
 * specs already run after `global-setup.ts` has populated `MONGODB_URI`, so
 * this shim keeps the `seedCms({ tenantId })` calling convention spec files
 * have used since before the package extraction.
 *
 * @param opts - Tenant scope for the reset.
 * @throws If `MONGODB_URI` is unset (`global-setup.ts` must run first).
 */
export async function seedCms(opts: SeedCmsOptions): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('[seed-cms] MONGODB_URI not set; globalSetup must run first');
    await pkgSeedCms(uri, opts);
}
