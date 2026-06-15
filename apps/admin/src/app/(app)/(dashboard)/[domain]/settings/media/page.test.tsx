import { describe, expect, it, vi } from 'vitest';

const { mockEditorListPage } = vi.hoisted(() => ({ mockEditorListPage: vi.fn(() => null) }));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorListPage: mockEditorListPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    mediaEditor: { __mock: true, collection: 'media' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('server-only', () => ({}));

import ShopSettingsMediaListPage from './page';

describe('ShopSettingsMediaListPage', () => {
    it('passes the manifest + runtime + domain to <EditorListPage>', async () => {
        const el = await ShopSettingsMediaListPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorListPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'media' },
            runtime: { __mock: true },
            params: { domain: 'acme.test' },
        });
    });

    it('forwards searchParams.page to <EditorListPage>', async () => {
        const el = await ShopSettingsMediaListPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({ page: '2' }),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.props).toMatchObject({ searchParams: { page: '2' } });
    });

    it('exposes the page title via metadata', async () => {
        const { metadata } = await import('./page');
        expect(metadata.title).toBe('Media');
    });
});
