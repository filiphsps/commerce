import { seedCms } from './cms';
import { seedShop } from './shop';

/**
 * Seeds the canonical demo tenant into a Convex deployment: one Shop
 * (`nordcom-demo-shop.com`, "Nordcom Demo Shop") plus tenant-scoped
 * Header/Footer/BusinessData/Page/Article via {@link seedShop} and
 * {@link seedCms}. Idempotent — safe to call repeatedly against the same URL.
 *
 * @param url - Deployment URL both seed phases connect to.
 * @returns Resolves once the demo shop and its CMS documents are present.
 * @throws Always until HARNESS-02 implements the seed phases.
 */
export async function seedCanonical(url: string): Promise<void> {
    await seedShop(url);
    // TODO(HARNESS-02): resolve real seeded shop _id
    await seedCms(url, { shopId: '' });
}
