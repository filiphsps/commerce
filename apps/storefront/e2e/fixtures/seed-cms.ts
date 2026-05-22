import { getPayloadInstance } from '@nordcom/commerce-cms/api';
import { headerItemsWithAllVariants } from './header-variants';

export type SeedCmsOptions = {
    tenantId: string;
};

/**
 * Seeds Header + Footer + BusinessData + a Page + an Article for E2E specs.
 * Idempotent — drops and re-inserts the docs for the given tenant.
 *
 * Boots a real Payload instance because the access predicates the storefront
 * exercises (tenant scoping, published-vs-draft) only work end-to-end against
 * the real Payload instance. This is the one E2E seed allowed to do so per
 * the project test policy.
 */
export async function seedCms({ tenantId }: SeedCmsOptions): Promise<void> {
    const payload = await getPayloadInstance();

    // Reset.
    for (const collection of ['header', 'footer', 'businessData', 'pages', 'articles'] as const) {
        await payload.delete({
            collection: collection as never,
            where: { tenant: { equals: tenantId } } as never,
        });
    }

    // Header — all three mega-menu variants so variant-specific e2e tests can run.
    await payload.create({
        collection: 'header',
        data: {
            tenant: tenantId,
            logoLink: '/',
            items: headerItemsWithAllVariants,
            localeSwitcher: { enabled: true },
            cta: { kind: 'external', label: 'Sign up', url: 'https://example/signup', openInNewTab: false },
            _status: 'published',
        } as never,
    });

    // Footer.
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
                                url: 'https://example/contact',
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
                        url: 'https://example/privacy',
                        openInNewTab: false,
                    },
                },
            ],
            copyrightLine: '© Example 2026',
            _status: 'published',
        } as never,
    });

    // BusinessData.
    await payload.create({
        collection: 'businessData',
        data: {
            tenant: tenantId,
            legalName: 'Example AB',
            supportEmail: 'support@example.com',
            supportPhone: '+46 70 000 00 00',
            _status: 'published',
        } as never,
    });

    // Article (matching a Shopify article slug seeded by the existing shop fixture).
    await payload.create({
        collection: 'articles',
        data: {
            tenant: tenantId,
            slug: 'launch',
            title: 'Launch — CMS Overlay',
            author: 'E2E Bot',
            publishedAt: new Date().toISOString(),
            excerpt: 'Overlay excerpt',
            body: { root: { children: [{ type: 'paragraph', children: [{ text: 'CMS-driven body' }] }] } },
            tags: ['launch', 'overlay'],
            seo: {
                title: 'Launch — Overlay SEO',
                description: 'Overlay description',
                keywords: ['launch'],
                noindex: false,
            },
            _status: 'published',
        } as never,
    });
}
