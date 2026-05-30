/**
 * Options for {@link seedCms}. Carries the id of the Shop the newly created
 * CMS documents (header, footer, business data, pages, articles, metadata)
 * are scoped to.
 *
 * @example
 * ```ts
 * await seedCms(url, { shopId });
 * ```
 */
export interface SeedCmsOptions {
    shopId: string;
}

/**
 * Resets and re-creates the canonical CMS documents for the given Shop in the
 * target Convex deployment. Tenant-scopes every document to `shopId` so
 * storefront CMS reads resolve instead of hitting the 404 path.
 *
 * @param url - Deployment URL the seed mutations run against.
 * @param opts - The Shop id every CMS document is scoped to.
 * @returns Resolves once the CMS documents exist in the deployment.
 * @throws Always until HARNESS-02 implements the seed mutations.
 */
export async function seedCms(url: string, opts: SeedCmsOptions): Promise<void> {
    throw new Error(
        `@nordcom/commerce-test-convex: seedCms(${url}, ${JSON.stringify(opts)}) is not implemented yet (HARNESS-02).`,
    );
}
