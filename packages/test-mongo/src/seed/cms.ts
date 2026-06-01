import { getPayloadInstance } from '@nordcom/commerce-cms/api';
import { articleFixtures } from './fixtures/articles';
import { businessDataFixture } from './fixtures/business-data';
import { collectionMetadataFixtures } from './fixtures/collection-metadata';
import { featureFlagFixtures } from './fixtures/feature-flags';
import { footerData } from './fixtures/footer';
import { headerData } from './fixtures/header';
import { pageFixtures } from './fixtures/pages';
import { productMetadataFixtures } from './fixtures/product-metadata';

/**
 * Options for {@link seedCms}. Carries the Mongo `_id` of the Shop. Under the
 * unified tenant model (UNIFY-03) the shop row id IS the multi-tenant tenant
 * key, so every tenant-scoped CMS doc is scoped directly to this id — there is
 * no separate Payload tenant document to bind back to.
 *
 * @example
 * ```ts
 * await seedCms(uri, { shopId: String(shop._id) });
 * ```
 */
export interface SeedCmsOptions {
    shopId: string;
}

const TENANT_COLLECTIONS = [
    'header',
    'footer',
    'businessData',
    'pages',
    'articles',
    'productMetadata',
    'collectionMetadata',
] as const;

/**
 * Resets and re-creates the canonical CMS docs for the given Shop via the
 * real Payload local API. The fixtures live under `./fixtures/` so the data
 * stays browsable in source and the orchestrator below stays a thin loop.
 *
 * `getPayloadInstance` reads `MONGODB_URI` and `PAYLOAD_SECRET` at boot, so
 * callers must set them before invoking — `MONGODB_URI` is force-set here as a
 * belt-and-braces for the production runtime where the seed runs against an
 * already-known URI; Vitest beforeAll blocks set it explicitly.
 *
 * UNIFY-03 unified the multi-tenant tenant collection onto `shops` (shop ==
 * tenant, keyed on the shop row id), so the plugin writes the shop row's own
 * `_id` into every tenant-scoped doc's `tenant` field. The seed therefore
 * scopes every insert directly to `shopId` — no separate tenant document is
 * created. `resolveTenantId(shop.id)` confirms that shop row exists and returns
 * the same id, so storefront CMS reads (`where: { tenant: { equals: shopId } }`)
 * match these docs instead of hitting the 404 path.
 *
 * @param uri - MongoDB connection string Payload should bind to.
 * @param opts - Source Shop `_id`, used directly as the tenant scope.
 */
export async function seedCms(uri: string, { shopId }: SeedCmsOptions): Promise<void> {
    if (!process.env.MONGODB_URI) process.env.MONGODB_URI = uri;
    console.info('[seedCms] booting Payload local API (cold-start can be slow) …');
    const payloadStartedAt = Date.now();
    const payload = await getPayloadInstance();
    console.info(`[seedCms] Payload ready in ${Date.now() - payloadStartedAt}ms`);

    console.info(`[seedCms] scoping CMS docs to shop row id=${shopId} (shop == tenant)`);

    for (const collection of TENANT_COLLECTIONS) {
        console.info(`[seedCms] resetting ${collection} for tenant ${shopId}`);
        await payload.delete({
            collection: collection as never,
            where: { tenant: { equals: shopId } } as never,
            overrideAccess: true,
            disableTransaction: true,
        });
    }
    console.info('[seedCms] resetting feature-flags (global — not tenant-scoped)');
    await payload.delete({
        collection: 'feature-flags' as never,
        where: { key: { exists: true } } as never,
        overrideAccess: true,
        disableTransaction: true,
    });

    console.info('[seedCms] creating header (5 top-level items, up to 6 levels deep)');
    await payload.create({
        collection: 'header',
        data: {
            tenant: shopId,
            logoLink: '/',
            items: headerData.items,
            localeSwitcher: { enabled: true, label: 'Region' },
            cta: { kind: 'external', label: 'Sign up', url: '/newsletter/', openInNewTab: false },
            _status: 'published',
        } as never,
        overrideAccess: true,
        disableTransaction: true,
    });

    console.info(
        `[seedCms] creating footer (${footerData.sections.length} sections, ${footerData.social.length} social, ${footerData.legal.length} legal)`,
    );
    await payload.create({
        collection: 'footer',
        data: {
            tenant: shopId,
            ...footerData,
            _status: 'published',
        } as never,
        overrideAccess: true,
        disableTransaction: true,
    });

    console.info('[seedCms] creating businessData');
    await payload.create({
        collection: 'businessData',
        data: {
            tenant: shopId,
            ...businessDataFixture,
            _status: 'published',
        } as never,
        overrideAccess: true,
        disableTransaction: true,
    });

    for (const page of pageFixtures) {
        console.info(`[seedCms] creating page (slug=${page.slug}, ${page.blocks.length} blocks)`);
        await payload.create({
            collection: 'pages',
            data: {
                tenant: shopId,
                slug: page.slug,
                title: page.title,
                blocks: page.blocks,
                seo: page.seo,
                _status: 'published',
            } as never,
            overrideAccess: true,
            disableTransaction: true,
        });
    }

    for (const article of articleFixtures) {
        console.info(`[seedCms] creating article (slug=${article.slug}, by ${article.author})`);
        await payload.create({
            collection: 'articles',
            data: {
                tenant: shopId,
                slug: article.slug,
                title: article.title,
                author: article.author,
                publishedAt: article.publishedAt,
                excerpt: article.excerpt,
                body: article.body,
                tags: article.tags,
                seo: article.seo,
                _status: 'published',
            } as never,
            overrideAccess: true,
            disableTransaction: true,
        });
    }

    for (const product of productMetadataFixtures) {
        console.info(
            `[seedCms] creating productMetadata (shopifyHandle=${product.shopifyHandle}, ${product.blocks.length} blocks)`,
        );
        await payload.create({
            collection: 'productMetadata',
            data: {
                tenant: shopId,
                shopifyHandle: product.shopifyHandle,
                descriptionOverride: product.descriptionOverride,
                blocks: product.blocks,
                seo: product.seo,
                _status: 'published',
            } as never,
            overrideAccess: true,
            disableTransaction: true,
        });
    }

    for (const collection of collectionMetadataFixtures) {
        console.info(
            `[seedCms] creating collectionMetadata (shopifyHandle=${collection.shopifyHandle}, ${collection.blocks.length} blocks)`,
        );
        await payload.create({
            collection: 'collectionMetadata',
            data: {
                tenant: shopId,
                shopifyHandle: collection.shopifyHandle,
                descriptionOverride: collection.descriptionOverride,
                blocks: collection.blocks,
                seo: collection.seo,
                _status: 'published',
            } as never,
            overrideAccess: true,
            disableTransaction: true,
        });
    }

    for (const flag of featureFlagFixtures) {
        console.info(`[seedCms] creating feature-flag (key=${flag.key})`);
        // Payload's `type: 'json'` field is backed by Monaco in the admin and
        // expects a stringified payload via the local API. Round-tripping
        // through `JSON.stringify` here is what the admin would submit on
        // save, and side-steps the validator's `required && !value` quirk
        // (which would otherwise reject bare `false`).
        await payload.create({
            collection: 'feature-flags',
            data: {
                key: flag.key,
                description: flag.description,
                defaultValue: JSON.stringify(flag.defaultValue),
                options: flag.options?.map((o) => ({ label: o.label, value: JSON.stringify(o.value) })),
                targeting: flag.targeting?.map((t) => ({
                    rule: t.rule,
                    params: JSON.stringify(t.params),
                    value: JSON.stringify(t.value),
                    description: t.description,
                })),
            } as never,
            overrideAccess: true,
            disableTransaction: true,
        });
    }

    console.info(
        `[seedCms] all collections created: 1 header / 1 footer / 1 businessData / ${pageFixtures.length} pages / ${articleFixtures.length} articles / ${productMetadataFixtures.length} productMetadata / ${collectionMetadataFixtures.length} collectionMetadata / ${featureFlagFixtures.length} feature-flags`,
    );
}
