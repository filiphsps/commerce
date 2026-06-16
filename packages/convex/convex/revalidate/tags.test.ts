import { cmsCacheSchema, cmsTenantRootTags } from '@nordcom/commerce-cms/cache-descriptor';
import { computeFanout } from '@tagtree/core';
import { describe, expect, it } from 'vitest';

import { deriveRevalidateTags } from './tags';

/**
 * The tenant id every case derives against; an arbitrary shop id, chosen so the encoded tags are
 * human-readable and contain no characters the segment encoder would escape.
 */
const TENANT_ID = 'shop_123';

/**
 * The CMS entity names, read from the shared taxonomy rather than hard-coded, so a change to the
 * declared entities surfaces here (the broad-sweep assertion pins the count).
 */
const cmsEntityNames = Object.keys(cmsCacheSchema.schema.entities);

describe('deriveRevalidateTags', () => {
    it('declares exactly the six CMS entities the broad sweep covers', () => {
        expect(cmsEntityNames).toHaveLength(6);
    });

    it('derives the exact read-side fanout for each of the CMS entities', () => {
        for (const entity of cmsEntityNames) {
            const key = `${entity}-doc`;
            const readSideTags = computeFanout(cmsCacheSchema.schema, {
                entity,
                tenant: { id: TENANT_ID },
                params: { key },
            });

            expect(deriveRevalidateTags({ collection: entity, key, tenantId: TENANT_ID })).toEqual(readSideTags);
        }
    });

    it('stamps the literal leaf-to-root tag set the read side produces for a page', () => {
        expect(deriveRevalidateTags({ collection: 'pages', key: 'about', tenantId: TENANT_ID })).toEqual([
            'cms.shop_123.pages.about',
            'cms.shop_123.pages',
            'cms.shop_123',
            'cms',
        ]);
    });

    it('omits the leaf tag for a collection-level publish with no key', () => {
        const readSideTags = computeFanout(cmsCacheSchema.schema, {
            entity: 'pages',
            tenant: { id: TENANT_ID },
            params: {},
        });

        const derived = deriveRevalidateTags({ collection: 'pages', tenantId: TENANT_ID });
        expect(derived).toEqual(readSideTags);
        expect(derived).toEqual(['cms.shop_123.pages', 'cms.shop_123', 'cms']);
    });

    it('yields cmsTenantRootTags(shop) for a broad publish with no collection', () => {
        expect(deriveRevalidateTags({ tenantId: TENANT_ID })).toEqual(cmsTenantRootTags({ id: TENANT_ID }));
    });

    it('falls back to the tenant root for a collection outside the CMS taxonomy', () => {
        expect(deriveRevalidateTags({ collection: 'settings', key: 'x', tenantId: TENANT_ID })).toEqual(
            cmsTenantRootTags({ id: TENANT_ID }),
        );
    });
});
