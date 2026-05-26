import { getPayloadInstance } from '@nordcom/commerce-cms/api';

export interface SeedCmsOptions {
    tenantId: string;
}

/**
 * Resets and re-creates the canonical CMS docs for the given tenant via the
 * real Payload local API. Mirrors the contract of
 * `apps/storefront/e2e/fixtures/seed-cms.ts`: one Header, one Footer, one
 * BusinessData, one Page (`/about`), one Article.
 *
 * `getPayloadInstance` reads `MONGODB_URI` and `PAYLOAD_SECRET` at boot, so
 * callers must set them before invoking — `MONGODB_URI` is force-set here as a
 * belt-and-braces for the production runtime where the seed runs against an
 * already-known URI; Vitest beforeAll blocks set it explicitly.
 */
export async function seedCms(uri: string, { tenantId }: SeedCmsOptions): Promise<void> {
    if (!process.env.MONGODB_URI) process.env.MONGODB_URI = uri;
    console.info('[seedCms] booting Payload local API (cold-start can be slow) …');
    const payloadStartedAt = Date.now();
    const payload = await getPayloadInstance();
    console.info(`[seedCms] Payload ready in ${Date.now() - payloadStartedAt}ms`);

    for (const collection of ['header', 'footer', 'businessData', 'pages', 'articles'] as const) {
        console.info(`[seedCms] resetting ${collection} for tenant ${tenantId}`);
        await payload.delete({
            collection: collection as never,
            where: { tenant: { equals: tenantId } } as never,
            overrideAccess: true,
            disableTransaction: true,
        });
    }

    // Header — all three mega-menu variants so variant-specific tests cover
    // every render path. `kind: 'external'` matches the `linkField` options in
    // `packages/cms/src/fields/link.ts`; the variant strings come from
    // `HEADER_VARIANTS` in `packages/cms/src/fields/nav-item.ts`.
    console.info('[seedCms] creating header');
    await payload.create({
        collection: 'header',
        data: {
            tenant: tenantId,
            logoLink: '/',
            items: [
                {
                    link: { kind: 'external', label: 'Editorial', url: '/editorial', openInNewTab: false },
                    variant: 'editorial-columns',
                    items: [
                        {
                            link: { kind: 'external', label: 'Sub 1', url: '/sub-1', openInNewTab: false },
                        },
                    ],
                },
                {
                    link: { kind: 'external', label: 'Compact', url: '/compact', openInNewTab: false },
                    variant: 'compact-list',
                    items: [{ link: { kind: 'external', label: 'About', url: '/about', openInNewTab: false } }],
                },
                {
                    link: { kind: 'external', label: 'Featured', url: '/featured', openInNewTab: false },
                    variant: 'featured-promo',
                    items: [{ link: { kind: 'external', label: 'See all', url: '/all', openInNewTab: false } }],
                },
            ],
            localeSwitcher: { enabled: true },
            _status: 'published',
        } as never,
        overrideAccess: true,
        disableTransaction: true,
    });

    // Footer — `sections[].title` and `social[].platform`/`url` are required
    // per `packages/cms/src/collections/_globals/footer.ts`. The seed keeps
    // the structure minimal but non-empty so renderers exercise both.
    console.info('[seedCms] creating footer');
    await payload.create({
        collection: 'footer',
        data: {
            tenant: tenantId,
            sections: [
                {
                    title: 'Help',
                    links: [
                        {
                            link: {
                                kind: 'external',
                                label: 'Contact',
                                url: '/contact',
                                openInNewTab: false,
                            },
                        },
                    ],
                },
            ],
            social: [{ platform: 'instagram', url: 'https://instagram.com/example' }],
            legal: [
                {
                    link: {
                        kind: 'external',
                        label: 'Privacy',
                        url: '/privacy',
                        openInNewTab: false,
                    },
                },
            ],
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
            legalName: 'Nordcom Demo Shop Ltd.',
            supportEmail: 'hello@nordcom-demo-shop.example.com',
            _status: 'published',
        } as never,
        overrideAccess: true,
        disableTransaction: true,
    });

    // `title` and `slug` are required per `packages/cms/src/collections/pages.ts`.
    console.info('[seedCms] creating page (slug=about)');
    await payload.create({
        collection: 'pages',
        data: {
            tenant: tenantId,
            slug: 'about',
            title: 'About',
            _status: 'published',
        } as never,
        overrideAccess: true,
        disableTransaction: true,
    });

    // `title`, `slug`, and `author` are required per
    // `packages/cms/src/collections/articles.ts`.
    console.info('[seedCms] creating article (slug=hello-world)');
    await payload.create({
        collection: 'articles',
        data: {
            tenant: tenantId,
            slug: 'hello-world',
            title: 'Hello world',
            author: 'Seed',
            _status: 'published',
        } as never,
        overrideAccess: true,
        disableTransaction: true,
    });
    console.info('[seedCms] all collections created');
}
