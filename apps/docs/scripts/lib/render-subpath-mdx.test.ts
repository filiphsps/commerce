import { describe, expect, it } from 'vitest';
import { renderSubpathOverviewMdx } from './render-subpath-mdx';

describe('renderSubpathOverviewMdx', () => {
    it('groups symbols by kind and links own-page rows', () => {
        const mdx = renderSubpathOverviewMdx({
            workspaceSlug: 'cms',
            subpath: 'api',
            rows: [
                { name: 'getArticle', kind: 'function', fate: 'own-page', summary: 'Fetch one article.' },
                { name: 'listArticles', kind: 'function', fate: 'own-page', summary: 'List articles.' },
                { name: 'ArticleQuery', kind: 'type', fate: 'inline', summary: 'Args for getArticle.' },
            ],
        });
        expect(mdx).toContain('## Functions');
        expect(mdx).toContain('[`getArticle`](./get-article)');
        expect(mdx).toContain('## Types');
        expect(mdx).toContain('| `ArticleQuery` | Args for getArticle. |');
    });

    it('renders the reference back-link banner at the top', () => {
        const mdx = renderSubpathOverviewMdx({ workspaceSlug: 'cms', subpath: 'api', rows: [] });
        expect(mdx).toContain('<ReferenceBackLink slug="cms" subpath="api" />');
    });
});
