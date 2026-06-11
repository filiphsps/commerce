import { seedShop } from './shop';

/**
 * Seeds the canonical demo tenant's Mongo remnant: one Shop
 * (`nordcom-demo-shop.com`, "Nordcom Demo Shop"). Idempotent — safe to call
 * repeatedly against the same URI. The CMS half of the canonical corpus moved
 * to `@nordcom/commerce-test-convex` with the cutover; the Payload seed this
 * orchestrator used to run is gone (TEARDOWN-02).
 *
 * @param uri - Mongo connection string the seed binds to.
 */
export async function seedCanonical(uri: string): Promise<void> {
    console.info('[seedCanonical] seeding Shop …');
    const shopStartedAt = Date.now();
    await seedShop(uri);
    console.info(`[seedCanonical] Shop seed complete in ${Date.now() - shopStartedAt}ms`);
}
