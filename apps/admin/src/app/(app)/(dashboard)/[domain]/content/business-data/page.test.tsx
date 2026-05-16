import { describe, expect, it, vi } from 'vitest';

const { mockEditorEditPage } = vi.hoisted(() => ({ mockEditorEditPage: vi.fn(() => null) }));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorEditPage: mockEditorEditPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    businessDataEditor: { __mock: true, collection: 'businessData' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('@/lib/cms-actions/_generated/businessData', () => ({
    businessDataSaveDraft: () => undefined,
    businessDataPublish: () => undefined,
    businessDataCreate: () => undefined,
    businessDataDelete: () => undefined,
    businessDataBulkDelete: () => undefined,
    businessDataBulkPublish: () => undefined,
    businessDataRestoreVersion: () => undefined,
}));
vi.mock('server-only', () => ({}));

import BusinessDataPage from './page';

describe('BusinessDataPage', () => {
    it('passes the manifest + runtime + sentinel id to <EditorEditPage>', async () => {
        // The page returns a ReactElement — the child function isn't invoked
        // until React renders. Inspect the element's type + props directly so
        // the test stays node-only (no happy-dom).
        const el = await BusinessDataPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorEditPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'businessData' },
            runtime: { __mock: true },
            params: { domain: 'acme.test', id: 'singleton' },
        });
    });
});
