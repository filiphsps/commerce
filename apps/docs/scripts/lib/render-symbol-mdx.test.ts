import { describe, expect, it } from 'vitest';
import { renderSymbolMdx } from './render-symbol-mdx';
import { KIND_FUNCTION } from './typedoc-types';

describe('renderSymbolMdx', () => {
    it('renders a function with summary, params, returns, throws, example', () => {
        const mdx = renderSymbolMdx({
            workspaceSlug: 'cms',
            subpath: 'api',
            kind: 'function',
            symbol: {
                id: 1,
                name: 'getArticle',
                kind: KIND_FUNCTION,
                signatures: [{
                    id: 2,
                    name: 'getArticle',
                    kind: KIND_FUNCTION,
                    parameters: [{ id: 3, name: 'opts', type: { type: 'reference', name: 'GetArticleArgs' } }],
                    type: { type: 'reference', name: 'Promise<Article | null>' },
                    comment: {
                        summary: [{ kind: 'text', text: 'Fetch one article by slug for a tenant.' }],
                        blockTags: [
                            { tag: '@param', content: [{ kind: 'text', text: 'opts the args' }] },
                            { tag: '@returns', content: [{ kind: 'text', text: 'the article or null' }] },
                            { tag: '@throws', content: [{ kind: 'text', text: 'NotFoundError on invalid slug' }] },
                            { tag: '@example', content: [{ kind: 'text', text: '```ts\nconst a = await getArticle();\n```' }] },
                        ],
                    },
                }],
                sources: [{ fileName: 'packages/cms/src/api/get-article.ts', line: 14 }],
            },
        });
        expect(mdx).toMatchSnapshot();
    });

    it('emits a DeprecatedBanner when @deprecated is present', () => {
        const mdx = renderSymbolMdx({
            workspaceSlug: 'cms',
            subpath: 'api',
            kind: 'function',
            symbol: {
                id: 1,
                name: 'oldThing',
                kind: KIND_FUNCTION,
                signatures: [{
                    id: 2,
                    name: 'oldThing',
                    kind: KIND_FUNCTION,
                    comment: {
                        blockTags: [{ tag: '@deprecated', content: [{ kind: 'text', text: 'Use newThing instead.' }] }],
                    },
                }],
            },
        });
        expect(mdx).toContain('<DeprecatedBanner>Use newThing instead.</DeprecatedBanner>');
    });
});
