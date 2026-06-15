import { describe, expect, it, vi } from 'vitest';

const { mockEditorNewPage } = vi.hoisted(() => ({ mockEditorNewPage: vi.fn(() => null) }));
const { actions } = vi.hoisted(() => ({
    actions: {
        articlesSaveDraft: vi.fn(),
        articlesPublish: vi.fn(),
        articlesCreate: vi.fn(),
        articlesDelete: vi.fn(),
        articlesBulkDelete: vi.fn(),
        articlesBulkPublish: vi.fn(),
        articlesRestoreVersion: vi.fn(),
    },
}));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorNewPage: mockEditorNewPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    articlesEditor: { __mock: true, collection: 'articles' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('@/lib/cms-actions/_generated/articles', () => actions);
vi.mock('server-only', () => ({}));

import NewArticlePage from './page';

describe('NewArticlePage', () => {
    it('passes the manifest + runtime + domain to <EditorNewPage>', async () => {
        const el = await NewArticlePage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorNewPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'articles' },
            runtime: { __mock: true },
            params: { domain: 'acme.test' },
        });
    });

    it('forwards searchParams.locale to <EditorNewPage>', async () => {
        const el = await NewArticlePage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.props).toMatchObject({ searchParams: { locale: 'de-DE' } });
    });

    it('wires every generated action to its matching export', async () => {
        const el = await NewArticlePage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: { generatedActions: Record<string, unknown> } };
        const generated = element.props.generatedActions;
        expect(generated.saveDraft).toBe(actions.articlesSaveDraft);
        expect(generated.publish).toBe(actions.articlesPublish);
        expect(generated.create).toBe(actions.articlesCreate);
        expect(generated.delete).toBe(actions.articlesDelete);
        expect(generated.bulkDelete).toBe(actions.articlesBulkDelete);
        expect(generated.bulkPublish).toBe(actions.articlesBulkPublish);
        expect(generated.restoreVersion).toBe(actions.articlesRestoreVersion);
    });

    it('exposes the page title via metadata', async () => {
        const { metadata } = await import('./page');
        expect(metadata.title).toBe('New Article');
    });
});
