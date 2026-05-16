import { describe, expect, it } from 'vitest';
import { generateActionWrapper } from './cms-gen';

describe('generateActionWrapper', () => {
    it('emits a use-server file with seven exports for businessData', () => {
        const output = generateActionWrapper({ slug: 'businessData', importName: 'businessDataEditor' });
        expect(output).toContain("'use server';");
        expect(output).toContain("import 'server-only';");
        expect(output).toContain("import { businessDataEditor } from '@nordcom/commerce-cms/editor/manifests';");
        expect(output).toContain("import { createCollectionEditorActions } from '@nordcom/commerce-cms/editor';");
        expect(output).toContain("import { editorRuntime } from '@/lib/editor-runtime';");
        expect(output).toContain('export async function businessDataSaveDraft');
        expect(output).toContain('export async function businessDataPublish');
        expect(output).toContain('export async function businessDataCreate');
        expect(output).toContain('export async function businessDataDelete');
        expect(output).toContain('export async function businessDataBulkDelete');
        expect(output).toContain('export async function businessDataBulkPublish');
        expect(output).toContain('export async function businessDataRestoreVersion');
    });

    it('starts with the auto-generated warning comment', () => {
        const output = generateActionWrapper({ slug: 'businessData', importName: 'businessDataEditor' });
        expect(output.split('\n')[0]).toMatch(/AUTO-GENERATED/);
    });

    it('converts kebab-case slugs to camelCase action names', () => {
        const output = generateActionWrapper({ slug: 'productMetadata', importName: 'productMetadataEditor' });
        expect(output).toContain('export async function productMetadataSaveDraft');
    });
});
