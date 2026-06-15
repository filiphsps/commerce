import { describe, expect, it, vi } from 'vitest';

const { mockEditorListPage } = vi.hoisted(() => ({ mockEditorListPage: vi.fn(() => null) }));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorListPage: mockEditorListPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    pagesEditor: { __mock: true, collection: 'pages' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('server-only', () => ({}));

import PagesListPage from './page';

describe('PagesListPage', () => {
    it('passes the manifest + runtime + domain to <EditorListPage>', async () => {
        const el = await PagesListPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorListPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'pages' },
            runtime: { __mock: true },
            params: { domain: 'acme.test' },
        });
    });

    it('forwards searchParams.locale to <EditorListPage>', async () => {
        const el = await PagesListPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.props).toMatchObject({ searchParams: { locale: 'de-DE' } });
    });

    it('exposes the page title via metadata', async () => {
        const { metadata } = await import('./page');
        expect(metadata.title).toBe('Pages');
    });
});
