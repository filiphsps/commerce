import { describe, expect, it, vi } from 'vitest';

const { mockEditorVersionsPage } = vi.hoisted(() => ({ mockEditorVersionsPage: vi.fn(() => null) }));
vi.mock('@nordcom/commerce-cms/editor/ui', () => ({ EditorVersionsPage: mockEditorVersionsPage }));
vi.mock('@nordcom/commerce-cms/editor/manifests', () => ({
    productMetadataEditor: { __mock: true, collection: 'productMetadata' },
}));
vi.mock('@/lib/editor-runtime', () => ({ editorRuntime: { __mock: true } }));
vi.mock('@/lib/cms-actions/_generated/productMetadata', () => ({
    productMetadataSaveDraft: vi.fn(),
    productMetadataPublish: vi.fn(),
    productMetadataCreate: vi.fn(),
    productMetadataDelete: vi.fn(),
    productMetadataBulkDelete: vi.fn(),
    productMetadataBulkPublish: vi.fn(),
    productMetadataRestoreVersion: vi.fn(),
}));
vi.mock('server-only', () => ({}));

import * as actions from '@/lib/cms-actions/_generated/productMetadata';
import ProductMetadataVersionsPage, { metadata } from './page';

describe('ProductMetadataVersionsPage', () => {
    it('passes the manifest + runtime + handle-as-id to <EditorVersionsPage>', async () => {
        const el = await ProductMetadataVersionsPage({
            params: Promise.resolve({ domain: 'acme.test', handle: 'wool-beanie' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { type: unknown; props: Record<string, unknown> };
        expect(element.type).toBe(mockEditorVersionsPage);
        expect(element.props).toMatchObject({
            manifest: { collection: 'productMetadata' },
            runtime: { __mock: true },
            // The `[handle]` route param is mapped onto the editor `id` prop.
            params: { domain: 'acme.test', id: 'wool-beanie' },
        });
    });

    it('wires each generated action to the matching export', async () => {
        const el = await ProductMetadataVersionsPage({
            params: Promise.resolve({ domain: 'acme.test', handle: 'wool-beanie' }),
            searchParams: Promise.resolve({}),
        });

        const element = el as { props: { generatedActions: Record<string, unknown> } };
        expect(element.props.generatedActions.saveDraft).toBe(actions.productMetadataSaveDraft);
        expect(element.props.generatedActions.publish).toBe(actions.productMetadataPublish);
        expect(element.props.generatedActions.create).toBe(actions.productMetadataCreate);
        expect(element.props.generatedActions.delete).toBe(actions.productMetadataDelete);
        expect(element.props.generatedActions.bulkDelete).toBe(actions.productMetadataBulkDelete);
        expect(element.props.generatedActions.bulkPublish).toBe(actions.productMetadataBulkPublish);
        expect(element.props.generatedActions.restoreVersion).toBe(actions.productMetadataRestoreVersion);
    });

    it('forwards searchParams.locale to <EditorVersionsPage>', async () => {
        const el = await ProductMetadataVersionsPage({
            params: Promise.resolve({ domain: 'acme.test', handle: 'wool-beanie' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });

        const element = el as { props: Record<string, unknown> };
        expect(element.props).toMatchObject({ searchParams: { locale: 'de-DE' } });
    });

    it('exposes the page title metadata', () => {
        expect(metadata.title).toBe('Product metadata — Versions');
    });
});
