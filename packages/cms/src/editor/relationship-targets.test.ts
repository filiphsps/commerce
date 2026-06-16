import { describe, expect, it, vi } from 'vitest';

import {
    arrayField,
    blocksField,
    collapsibleField,
    groupField,
    relationshipField,
    textField,
    uploadField,
} from '../descriptors';
import { editorCollectionSchema } from './collection-fields';
import { loadRelationshipOptions, relationshipTargetsOf } from './relationship-targets';
import type { EditorConvexBridge } from './runtime';

describe('relationshipTargetsOf', () => {
    it('collects relationship targets through groups, arrays, collapsibles, and block variants', () => {
        const fields = [
            textField({ name: 'title' }),
            relationshipField({ name: 'shop', relationTo: 'shops' }),
            groupField({
                name: 'meta',
                fields: [relationshipField({ name: 'page', relationTo: 'pages' })],
            }),
            arrayField({
                name: 'rows',
                fields: [
                    collapsibleField({
                        label: 'Advanced',
                        fields: [relationshipField({ name: 'article', relationTo: 'articles' })],
                    }),
                ],
            }),
            blocksField({
                name: 'blocks',
                blocks: [
                    {
                        slug: 'promo',
                        fields: [relationshipField({ name: 'target', relationTo: 'pages', hasMany: true })],
                    },
                ],
            }),
        ];
        expect(relationshipTargetsOf(fields)).toEqual(['articles', 'pages', 'shops']);
    });

    it('excludes upload targets — the file picker needs no option list', () => {
        expect(relationshipTargetsOf([uploadField({ name: 'image', relationTo: 'media' })])).toEqual([]);
    });

    it('resolves the real pages schema to the four link-field targets inside its blocks', () => {
        // Every block-embedded `linkField` carries the page/article/product/
        // collection relationship pickers; `media` stays out (upload fields).
        expect(relationshipTargetsOf(editorCollectionSchema('pages').fields)).toEqual([
            'articles',
            'collectionMetadata',
            'pages',
            'productMetadata',
        ]);
    });

    it('resolves the reviews schema to its shops relationship', () => {
        expect(relationshipTargetsOf(editorCollectionSchema('reviews').fields)).toEqual(['shops']);
    });
});

describe('loadRelationshipOptions', () => {
    it('prefetches one bounded option set per unique target through the bridge', async () => {
        const listRelationshipOptions = vi.fn(async ({ relationTo }: { relationTo: string }) => [
            { id: `${relationTo}-1`, label: `${relationTo} one` },
        ]);
        const bridge = { listRelationshipOptions } as unknown as EditorConvexBridge;
        const options = await loadRelationshipOptions(bridge, editorCollectionSchema('reviews').fields);

        expect(listRelationshipOptions).toHaveBeenCalledTimes(1);
        expect(listRelationshipOptions).toHaveBeenCalledWith({ relationTo: 'shops' });
        expect(options).toEqual({ shops: [{ id: 'shops-1', label: 'shops one' }] });
    });

    it('issues no Convex calls for a schema without relationship fields', async () => {
        const listRelationshipOptions = vi.fn();
        const bridge = { listRelationshipOptions } as unknown as EditorConvexBridge;
        const options = await loadRelationshipOptions(bridge, editorCollectionSchema('users').fields);

        expect(listRelationshipOptions).not.toHaveBeenCalled();
        expect(options).toEqual({});
    });

    it('degrades to an empty map without a bridge (test substrates)', async () => {
        await expect(loadRelationshipOptions(undefined, editorCollectionSchema('reviews').fields)).resolves.toEqual({});
    });
});
