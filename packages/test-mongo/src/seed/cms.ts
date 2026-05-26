import { getPayloadInstance } from '@nordcom/commerce-cms/api';
import { articleFixtures } from './fixtures/articles';
import { businessDataFixture } from './fixtures/business-data';
import { footerData } from './fixtures/footer';
import { headerData } from './fixtures/header';
import { pageFixtures } from './fixtures/pages';

export interface SeedCmsOptions {
    tenantId: string;
}

const TENANT_COLLECTIONS = ['header', 'footer', 'businessData', 'pages', 'articles'] as const;

/**
 * Resets and re-creates the canonical CMS docs for the given tenant via the
 * real Payload local API. The fixtures live under `./fixtures/` so the data
 * stays browsable in source and the orchestrator below stays a thin loop.
 *
 * `getPayloadInstance` reads `MONGODB_URI` and `PAYLOAD_SECRET` at boot, so
 * callers must set them before invoking — `MONGODB_URI` is force-set here as a
 * belt-and-braces for the production runtime where the seed runs against an
 * already-known URI; Vitest beforeAll blocks set it explicitly.
 *
 * @param uri - MongoDB connection string Payload should bind to.
 * @param opts - Tenant id whose docs will be wiped + re-created.
 */
export async function seedCms(uri: string, { tenantId }: SeedCmsOptions): Promise<void> {
    if (!process.env.MONGODB_URI) process.env.MONGODB_URI = uri;
    console.info('[seedCms] booting Payload local API (cold-start can be slow) …');
    const payloadStartedAt = Date.now();
    const payload = await getPayloadInstance();
    console.info(`[seedCms] Payload ready in ${Date.now() - payloadStartedAt}ms`);

    for (const collection of TENANT_COLLECTIONS) {
        console.info(`[seedCms] resetting ${collection} for tenant ${tenantId}`);
        await payload.delete({
            collection: collection as never,
            where: { tenant: { equals: tenantId } } as never,
            overrideAccess: true,
            disableTransaction: true,
        });
    }

    console.info('[seedCms] creating header (5 top-level items, up to 6 levels deep)');
    await payload.create({
        collection: 'header',
        data: {
            tenant: tenantId,
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
            tenant: tenantId,
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
            tenant: tenantId,
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
                tenant: tenantId,
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
                tenant: tenantId,
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

    console.info(
        `[seedCms] all collections created: 1 header / 1 footer / 1 businessData / ${pageFixtures.length} pages / ${articleFixtures.length} articles`,
    );
}
