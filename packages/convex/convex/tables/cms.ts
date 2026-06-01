/**
 * AUTO-GENERATED from the CMS field descriptors by `pnpm cms:gen`
 * (packages/cms/scripts/cms-gen.ts). DO NOT EDIT BY HAND — changes are
 * overwritten on the next run, and CI's `cms:gen:check` drift gate fails on any
 * uncommitted divergence. Edit the descriptors under packages/cms/src and
 * regenerate.
 *
 * CMS-owned content tables for the reserved `cmsTables` schema slot (see
 * `tables/index.ts`). Each table carries the tenant `shop` foreign key first and
 * a `by_shop` index per the multi-tenant schema convention; `shop` is a
 * forward-referenced `v.string()` until the `shops` table lands (see
 * `tables/reviews.ts`). Content fields are descriptor-derived; rich `blocks` /
 * rich-text bodies are stored opaquely (`v.any()`) pending CMSRICH-01.
 */
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * The CMS-owned content table group. Spread into `cmsTables` via `tables/index.ts`,
 * then into `defineSchema`.
 */
export const cmsContentTables = {
    pages: defineTable(
        v.object({
            shop: v.string(),
            title: v.string(),
            slug: v.string(),
            blocks: v.optional(v.array(v.any())),
            seo: v.optional(v.object({
                title: v.optional(v.string()),
                description: v.optional(v.string()),
                keywords: v.optional(v.array(v.string())),
                image: v.optional(v.string()),
                noindex: v.optional(v.boolean()),
            })),
            createdAt: v.number(),
            updatedAt: v.number(),
        })
    ).index('by_shop', ['shop']),
    articles: defineTable(
        v.object({
            shop: v.string(),
            title: v.string(),
            slug: v.string(),
            author: v.string(),
            publishedAt: v.optional(v.string()),
            cover: v.optional(v.string()),
            excerpt: v.optional(v.string()),
            body: v.optional(v.any()),
            tags: v.optional(v.array(v.string())),
            seo: v.optional(v.object({
                title: v.optional(v.string()),
                description: v.optional(v.string()),
                keywords: v.optional(v.array(v.string())),
                image: v.optional(v.string()),
                noindex: v.optional(v.boolean()),
            })),
            createdAt: v.number(),
            updatedAt: v.number(),
        })
    ).index('by_shop', ['shop']),
    productMetadata: defineTable(
        v.object({
            shop: v.string(),
            shopifyHandle: v.string(),
            descriptionOverride: v.optional(v.any()),
            blocks: v.optional(v.array(v.any())),
            seo: v.optional(v.object({
                title: v.optional(v.string()),
                description: v.optional(v.string()),
                keywords: v.optional(v.array(v.string())),
                image: v.optional(v.string()),
                noindex: v.optional(v.boolean()),
            })),
            createdAt: v.number(),
            updatedAt: v.number(),
        })
    ).index('by_shop', ['shop']),
    collectionMetadata: defineTable(
        v.object({
            shop: v.string(),
            shopifyHandle: v.string(),
            descriptionOverride: v.optional(v.any()),
            blocks: v.optional(v.array(v.any())),
            seo: v.optional(v.object({
                title: v.optional(v.string()),
                description: v.optional(v.string()),
                keywords: v.optional(v.array(v.string())),
                image: v.optional(v.string()),
                noindex: v.optional(v.boolean()),
            })),
            createdAt: v.number(),
            updatedAt: v.number(),
        })
    ).index('by_shop', ['shop']),
    media: defineTable(
        v.object({
            shop: v.string(),
            alt: v.string(),
            caption: v.optional(v.string()),
            createdAt: v.number(),
            updatedAt: v.number(),
        })
    ).index('by_shop', ['shop']),
    header: defineTable(
        v.object({
            shop: v.string(),
            logo: v.optional(v.string()),
            logoLink: v.optional(v.string()),
            items: v.optional(v.array(v.object({
                link: v.optional(v.object({
                    kind: v.optional(v.union(v.literal('page'), v.literal('article'), v.literal('product'), v.literal('collection'), v.literal('external'), v.literal('anchor'))),
                    page: v.optional(v.string()),
                    article: v.optional(v.string()),
                    product: v.optional(v.string()),
                    collectionRef: v.optional(v.string()),
                    url: v.optional(v.string()),
                    label: v.optional(v.string()),
                    openInNewTab: v.optional(v.boolean()),
                })),
                variant: v.optional(v.union(v.literal('editorial-columns'), v.literal('compact-list'), v.literal('featured-promo'))),
                image: v.optional(v.string()),
                description: v.optional(v.string()),
                backgroundColor: v.optional(v.string()),
                items: v.optional(v.array(v.object({
                    link: v.optional(v.object({
                        kind: v.optional(v.union(v.literal('page'), v.literal('article'), v.literal('product'), v.literal('collection'), v.literal('external'), v.literal('anchor'))),
                        page: v.optional(v.string()),
                        article: v.optional(v.string()),
                        product: v.optional(v.string()),
                        collectionRef: v.optional(v.string()),
                        url: v.optional(v.string()),
                        label: v.optional(v.string()),
                        openInNewTab: v.optional(v.boolean()),
                    })),
                    image: v.optional(v.string()),
                    description: v.optional(v.string()),
                    backgroundColor: v.optional(v.string()),
                    items: v.optional(v.array(v.object({
                        link: v.optional(v.object({
                            kind: v.optional(v.union(v.literal('page'), v.literal('article'), v.literal('product'), v.literal('collection'), v.literal('external'), v.literal('anchor'))),
                            page: v.optional(v.string()),
                            article: v.optional(v.string()),
                            product: v.optional(v.string()),
                            collectionRef: v.optional(v.string()),
                            url: v.optional(v.string()),
                            label: v.optional(v.string()),
                            openInNewTab: v.optional(v.boolean()),
                        })),
                        image: v.optional(v.string()),
                        description: v.optional(v.string()),
                        backgroundColor: v.optional(v.string()),
                        items: v.optional(v.array(v.object({
                            link: v.optional(v.object({
                                kind: v.optional(v.union(v.literal('page'), v.literal('article'), v.literal('product'), v.literal('collection'), v.literal('external'), v.literal('anchor'))),
                                page: v.optional(v.string()),
                                article: v.optional(v.string()),
                                product: v.optional(v.string()),
                                collectionRef: v.optional(v.string()),
                                url: v.optional(v.string()),
                                label: v.optional(v.string()),
                                openInNewTab: v.optional(v.boolean()),
                            })),
                            image: v.optional(v.string()),
                            description: v.optional(v.string()),
                            backgroundColor: v.optional(v.string()),
                            items: v.optional(v.array(v.object({
                                link: v.optional(v.object({
                                    kind: v.optional(v.union(v.literal('page'), v.literal('article'), v.literal('product'), v.literal('collection'), v.literal('external'), v.literal('anchor'))),
                                    page: v.optional(v.string()),
                                    article: v.optional(v.string()),
                                    product: v.optional(v.string()),
                                    collectionRef: v.optional(v.string()),
                                    url: v.optional(v.string()),
                                    label: v.optional(v.string()),
                                    openInNewTab: v.optional(v.boolean()),
                                })),
                                image: v.optional(v.string()),
                                description: v.optional(v.string()),
                                backgroundColor: v.optional(v.string()),
                                items: v.optional(v.array(v.object({
                                    link: v.optional(v.object({
                                        kind: v.optional(v.union(v.literal('page'), v.literal('article'), v.literal('product'), v.literal('collection'), v.literal('external'), v.literal('anchor'))),
                                        page: v.optional(v.string()),
                                        article: v.optional(v.string()),
                                        product: v.optional(v.string()),
                                        collectionRef: v.optional(v.string()),
                                        url: v.optional(v.string()),
                                        label: v.optional(v.string()),
                                        openInNewTab: v.optional(v.boolean()),
                                    })),
                                    image: v.optional(v.string()),
                                    description: v.optional(v.string()),
                                    backgroundColor: v.optional(v.string()),
                                }))),
                            }))),
                        }))),
                    }))),
                }))),
            }))),
            localeSwitcher: v.optional(v.object({
                enabled: v.optional(v.boolean()),
                label: v.optional(v.string()),
            })),
            cta: v.optional(v.object({
                kind: v.optional(v.union(v.literal('page'), v.literal('article'), v.literal('product'), v.literal('collection'), v.literal('external'), v.literal('anchor'))),
                page: v.optional(v.string()),
                article: v.optional(v.string()),
                product: v.optional(v.string()),
                collectionRef: v.optional(v.string()),
                url: v.optional(v.string()),
                label: v.optional(v.string()),
                openInNewTab: v.optional(v.boolean()),
            })),
            createdAt: v.number(),
            updatedAt: v.number(),
        })
    ).index('by_shop', ['shop']),
    footer: defineTable(
        v.object({
            shop: v.string(),
            sections: v.optional(v.array(v.object({
                title: v.string(),
                links: v.optional(v.array(v.object({
                    link: v.optional(v.object({
                        kind: v.optional(v.union(v.literal('page'), v.literal('article'), v.literal('product'), v.literal('collection'), v.literal('external'), v.literal('anchor'))),
                        page: v.optional(v.string()),
                        article: v.optional(v.string()),
                        product: v.optional(v.string()),
                        collectionRef: v.optional(v.string()),
                        url: v.optional(v.string()),
                        label: v.optional(v.string()),
                        openInNewTab: v.optional(v.boolean()),
                    })),
                }))),
            }))),
            social: v.optional(v.array(v.object({
                platform: v.union(v.literal('instagram'), v.literal('facebook'), v.literal('tiktok'), v.literal('youtube'), v.literal('x'), v.literal('linkedin')),
                url: v.string(),
            }))),
            legal: v.optional(v.array(v.object({
                link: v.optional(v.object({
                    kind: v.optional(v.union(v.literal('page'), v.literal('article'), v.literal('product'), v.literal('collection'), v.literal('external'), v.literal('anchor'))),
                    page: v.optional(v.string()),
                    article: v.optional(v.string()),
                    product: v.optional(v.string()),
                    collectionRef: v.optional(v.string()),
                    url: v.optional(v.string()),
                    label: v.optional(v.string()),
                    openInNewTab: v.optional(v.boolean()),
                })),
            }))),
            copyrightLine: v.optional(v.string()),
            createdAt: v.number(),
            updatedAt: v.number(),
        })
    ).index('by_shop', ['shop']),
    businessData: defineTable(
        v.object({
            shop: v.string(),
            legalName: v.optional(v.string()),
            supportEmail: v.optional(v.string()),
            supportPhone: v.optional(v.string()),
            address: v.optional(v.object({
                line1: v.optional(v.string()),
                line2: v.optional(v.string()),
                city: v.optional(v.string()),
                region: v.optional(v.string()),
                postalCode: v.optional(v.string()),
                country: v.optional(v.string()),
            })),
            profiles: v.optional(v.array(v.object({
                platform: v.string(),
                handle: v.string(),
                url: v.optional(v.string()),
            }))),
            createdAt: v.number(),
            updatedAt: v.number(),
        })
    ).index('by_shop', ['shop']),
};
