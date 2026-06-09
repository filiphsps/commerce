import { cmsCacheSchema, cmsTenantRootTags } from '@nordcom/commerce-cms/cache-descriptor';
import { computeFanout } from '@tagtree/core';
import { describe, expect, it } from 'vitest';

import { PUBLISHABLE_CMS_COLLECTIONS, publishFeedTags } from './on_publish_feed';

/**
 * The tenant id every case derives against; an arbitrary shop legacy id chosen so the literal tag
 * assertions stay human-readable.
 */
const TENANT_ID = 'shop_123';

describe('on-publish-feed (CMSDATA-08 completeness)', () => {
    it('pins the publishable-collection list to the shared taxonomy — all seven, no parallel registry', () => {
        expect([...PUBLISHABLE_CMS_COLLECTIONS]).toEqual([
            'articles',
            'businessData',
            'collectionMetadata',
            'footer',
            'header',
            'pages',
            'productMetadata',
        ]);
        expect([...PUBLISHABLE_CMS_COLLECTIONS]).toEqual(Object.keys(cmsCacheSchema.schema.entities).sort());
    });

    it('derives the entity fanout — never the tenant-root fallback — for EVERY publishable collection', () => {
        for (const collection of PUBLISHABLE_CMS_COLLECTIONS) {
            const tags = publishFeedTags({ collection, data: {}, tenantId: TENANT_ID });
            expect(tags).toEqual(
                computeFanout(cmsCacheSchema.schema, { entity: collection, tenant: { id: TENANT_ID }, params: {} }),
            );
            expect(tags).toContain(`cms.${TENANT_ID}.${collection}`);
            expect(tags).not.toEqual(cmsTenantRootTags({ id: TENANT_ID }));
        }
    });

    it('busts the document leaf for the slug-keyed collections', () => {
        for (const collection of ['pages', 'articles']) {
            expect(publishFeedTags({ collection, data: { slug: 'about' }, tenantId: TENANT_ID })).toEqual([
                `cms.${TENANT_ID}.${collection}.about`,
                `cms.${TENANT_ID}.${collection}`,
                `cms.${TENANT_ID}`,
                'cms',
            ]);
        }
    });

    it('busts the document leaf for the handle-keyed metadata collections', () => {
        for (const collection of ['productMetadata', 'collectionMetadata']) {
            expect(publishFeedTags({ collection, data: { shopifyHandle: 'snowboard' }, tenantId: TENANT_ID })).toEqual([
                `cms.${TENANT_ID}.${collection}.snowboard`,
                `cms.${TENANT_ID}.${collection}`,
                `cms.${TENANT_ID}`,
                'cms',
            ]);
        }
    });

    it('publishes the tenant singletons at the collection level even when data carries key-shaped fields', () => {
        for (const collection of ['header', 'footer', 'businessData']) {
            expect(
                publishFeedTags({ collection, data: { slug: 'x', shopifyHandle: 'y' }, tenantId: TENANT_ID }),
            ).toEqual([`cms.${TENANT_ID}.${collection}`, `cms.${TENANT_ID}`, 'cms']);
        }
    });

    it('treats media as non-publishable: outside the feed, falling back to the tenant-root sweep', () => {
        expect(PUBLISHABLE_CMS_COLLECTIONS).not.toContain('media');
        expect(publishFeedTags({ collection: 'media', data: { filename: 'a.png' }, tenantId: TENANT_ID })).toEqual(
            cmsTenantRootTags({ id: TENANT_ID }),
        );
    });
});
