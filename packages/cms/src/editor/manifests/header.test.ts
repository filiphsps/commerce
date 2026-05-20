import { describe, expect, it } from 'vitest';
import { headerEditor } from './header';

describe('headerEditor', () => {
    it('targets the header collection', () => {
        expect(headerEditor.collection).toBe('header');
    });
    it('is a per-tenant singleton', () => {
        expect(headerEditor.tenant).toEqual({ kind: 'tenant-singleton', field: 'tenant' });
    });
    it('basePath under /:domain/content/header/', () => {
        expect(headerEditor.routes.basePath('a.test')).toBe('/a.test/content/header/');
    });
    it('revalidates the header path', () => {
        expect(headerEditor.revalidate?.({ domain: 'a.test', doc: {}, status: 'published' })).toEqual([
            '/a.test/content/header/',
        ]);
    });
});
