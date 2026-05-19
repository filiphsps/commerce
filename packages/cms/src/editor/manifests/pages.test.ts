import { describe, expect, it } from 'vitest';
import { pagesEditor } from './pages';

describe('pagesEditor', () => {
    it('targets the pages collection', () => {
        expect(pagesEditor.collection).toBe('pages');
    });
    it('exposes list with bulkActions', () => {
        expect(pagesEditor.list?.bulkActions).toContain('delete');
        expect(pagesEditor.list?.bulkActions).toContain('publish');
    });
    it('basePath under /:domain/content/pages/', () => {
        expect(pagesEditor.routes.basePath('a.test')).toBe('/a.test/content/pages/');
    });
});
