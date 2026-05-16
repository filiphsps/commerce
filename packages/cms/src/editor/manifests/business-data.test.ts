import { describe, expect, it } from 'vitest';
import { businessDataEditor } from './business-data';

describe('businessDataEditor', () => {
    it('targets the businessData collection', () => {
        expect(businessDataEditor.collection).toBe('businessData');
    });

    it('is tenant-scoped via the `tenant` field', () => {
        expect(businessDataEditor.tenant).toEqual({ kind: 'scoped', field: 'tenant' });
    });

    it('exposes admin-only delete', () => {
        expect(businessDataEditor.access.delete).toBeDefined();
    });

    it('produces a basePath under /:domain/content/business-data/', () => {
        expect(businessDataEditor.routes.basePath('acme.com')).toBe('/acme.com/content/business-data/');
    });

    it('revalidates the businessData path on write', () => {
        expect(businessDataEditor.revalidate?.({ domain: 'acme.com', doc: {}, status: 'published' })).toEqual([
            '/acme.com/content/business-data/',
        ]);
    });
});
