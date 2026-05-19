import { describe, expect, it } from 'vitest';
import { footerEditor } from './footer';

describe('footerEditor', () => {
    it('targets the footer collection', () => {
        expect(footerEditor.collection).toBe('footer');
    });
    it('is tenant-scoped', () => {
        expect(footerEditor.tenant).toEqual({ kind: 'scoped', field: 'tenant' });
    });
    it('basePath under /:domain/content/footer/', () => {
        expect(footerEditor.routes.basePath('a.test')).toBe('/a.test/content/footer/');
    });
    it('revalidates the footer path', () => {
        expect(footerEditor.revalidate?.({ domain: 'a.test', doc: {}, status: 'published' })).toEqual([
            '/a.test/content/footer/',
        ]);
    });
});
