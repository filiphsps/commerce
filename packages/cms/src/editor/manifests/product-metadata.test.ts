import { describe, expect, it } from 'vitest';
import { productMetadataEditor } from './product-metadata';

describe('productMetadataEditor', () => {
    it('targets productMetadata', () => {
        expect(productMetadataEditor.collection).toBe('productMetadata');
    });
    it('uses shopifyHandle as keyField', () => {
        expect(productMetadataEditor.routes.keyField).toBe('shopifyHandle');
    });
    it('basePath under /:domain/content/product-metadata/', () => {
        expect(productMetadataEditor.routes.basePath('a.test')).toBe('/a.test/content/product-metadata/');
    });
});
