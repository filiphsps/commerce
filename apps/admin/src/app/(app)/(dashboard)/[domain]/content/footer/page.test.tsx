import { describe, expect, it, vi } from 'vitest';

const { mockEditorEditPage } = vi.hoisted(() => ({ mockEditorEditPage: vi.fn(() => null) }));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorEditPage: mockEditorEditPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    footerEditor: { __mock: true, collection: 'footer' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('@/lib/cms-actions/_generated/footer', () => ({
    footerSaveDraft: vi.fn(),
    footerPublish: vi.fn(),
    footerCreate: vi.fn(),
    footerDelete: vi.fn(),
    footerBulkDelete: vi.fn(),
    footerBulkPublish: vi.fn(),
    footerRestoreVersion: vi.fn(),
}));
vi.mock('server-only', () => ({}));

import * as actions from '@/lib/cms-actions/_generated/footer';
import FooterPage, { metadata } from './page';

describe('FooterPage', () => {
    it('passes the manifest + runtime + sentinel id to <EditorEditPage>', async () => {
        // The page returns a ReactElement — the child function isn't invoked
        // until React renders. Inspect the element's type + props directly so
        // the test stays node-only (no happy-dom).
        const el = await FooterPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorEditPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'footer' },
            runtime: { __mock: true },
            params: { domain: 'acme.test', id: '' },
        });
    });

    it('wires each generated action to the matching export', async () => {
        const el = await FooterPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { props: { generatedActions: Record<string, unknown> } };
        expect(element.props.generatedActions.saveDraft).toBe(actions.footerSaveDraft);
        expect(element.props.generatedActions.publish).toBe(actions.footerPublish);
        expect(element.props.generatedActions.create).toBe(actions.footerCreate);
        expect(element.props.generatedActions.delete).toBe(actions.footerDelete);
        expect(element.props.generatedActions.bulkDelete).toBe(actions.footerBulkDelete);
        expect(element.props.generatedActions.bulkPublish).toBe(actions.footerBulkPublish);
        expect(element.props.generatedActions.restoreVersion).toBe(actions.footerRestoreVersion);
    });

    it('forwards searchParams.locale to <EditorEditPage>', async () => {
        const el = await FooterPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { props: Record<string, unknown> };
        expect(element.props).toMatchObject({ searchParams: { locale: 'de-DE' } });
    });

    it('exposes the page title metadata', () => {
        expect(metadata.title).toBe('Footer');
    });
});
