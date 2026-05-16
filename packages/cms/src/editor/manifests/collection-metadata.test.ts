import { describe, expect, it } from 'vitest';
import { collectionMetadataEditor } from './collection-metadata';

describe('collectionMetadataEditor', () => {
    it('targets collectionMetadata', () => {
        expect(collectionMetadataEditor.collection).toBe('collectionMetadata');
    });
    it('uses shopifyHandle as keyField', () => {
        expect(collectionMetadataEditor.routes.keyField).toBe('shopifyHandle');
    });
    it('basePath under /:domain/content/collection-metadata/', () => {
        expect(collectionMetadataEditor.routes.basePath('a.test')).toBe('/a.test/content/collection-metadata/');
    });
});
