import { describe, expect, it, vi } from 'vitest';

const { mockEditorEditPage } = vi.hoisted(() => ({ mockEditorEditPage: vi.fn(() => null) }));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorEditPage: mockEditorEditPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    headerEditor: { __mock: true, collection: 'header' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('@/lib/cms-actions/_generated/header', () => ({
    headerSaveDraft: vi.fn(),
    headerPublish: vi.fn(),
    headerCreate: vi.fn(),
    headerDelete: vi.fn(),
    headerBulkDelete: vi.fn(),
    headerBulkPublish: vi.fn(),
    headerRestoreVersion: vi.fn(),
}));
vi.mock('server-only', () => ({}));

import * as actions from '@/lib/cms-actions/_generated/header';
import HeaderPage, { metadata } from './page';

describe('HeaderPage', () => {
    it('passes the manifest + runtime + sentinel id to <EditorEditPage>', async () => {
        const el = await HeaderPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorEditPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'header' },
            runtime: { __mock: true },
            params: { domain: 'acme.test', id: '' },
        });
    });

    it('wires each generated action to the matching export', async () => {
        const el = await HeaderPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { props: { generatedActions: Record<string, unknown> } };
        expect(element.props.generatedActions.saveDraft).toBe(actions.headerSaveDraft);
        expect(element.props.generatedActions.publish).toBe(actions.headerPublish);
        expect(element.props.generatedActions.create).toBe(actions.headerCreate);
        expect(element.props.generatedActions.delete).toBe(actions.headerDelete);
        expect(element.props.generatedActions.bulkDelete).toBe(actions.headerBulkDelete);
        expect(element.props.generatedActions.bulkPublish).toBe(actions.headerBulkPublish);
        expect(element.props.generatedActions.restoreVersion).toBe(actions.headerRestoreVersion);
    });

    it('forwards searchParams.locale to <EditorEditPage>', async () => {
        const el = await HeaderPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { props: Record<string, unknown> };
        expect(element.props).toMatchObject({ searchParams: { locale: 'de-DE' } });
    });

    it('exposes the page title metadata', () => {
        expect(metadata.title).toBe('Header');
    });
});
