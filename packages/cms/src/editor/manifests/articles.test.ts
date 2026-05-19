import { describe, expect, it } from 'vitest';
import { articlesEditor } from './articles';

describe('articlesEditor', () => {
    it('targets the articles collection', () => {
        expect(articlesEditor.collection).toBe('articles');
    });
    it('exposes list with bulkActions', () => {
        expect(articlesEditor.list?.bulkActions).toContain('delete');
        expect(articlesEditor.list?.bulkActions).toContain('publish');
    });
    it('basePath under /:domain/content/articles/', () => {
        expect(articlesEditor.routes.basePath('a.test')).toBe('/a.test/content/articles/');
    });
});
