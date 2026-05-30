/**
 * Customization knobs for {@link seedShop}. All fields are optional —
 * defaults produce the canonical `nordcom-demo-shop.com` fixture.
 *
 * @example
 * ```ts
 * // Pin a different domain for a staging environment:
 * await seedShop(url, { domain: 'staging.example.com' });
 * ```
 */
export interface SeedShopOptions {
    domain?: string;
    name?: string;
    overrides?: Record<string, unknown>;
}

/**
 * Creates the canonical demo Shop document in the target Convex deployment.
 * Idempotent — skips the insert when a shop with the same domain already exists.
 *
 * @param url - Deployment URL the seed mutation runs against.
 * @param opts - Optional overrides for domain, display name, and raw fields.
 * @returns Resolves once the Shop document is present in the deployment.
 * @throws Always until HARNESS-02 implements the seed mutation.
 */
export async function seedShop(url: string, opts: SeedShopOptions = {}): Promise<void> {
    throw new Error(
        `@nordcom/commerce-test-convex: seedShop(${url}, ${JSON.stringify(opts)}) is not implemented yet (HARNESS-02).`,
    );
}
