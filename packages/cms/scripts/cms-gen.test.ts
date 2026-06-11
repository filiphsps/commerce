import { LocalizedCompositeFieldError } from '@nordcom/commerce-errors';
import { describe, expect, it } from 'vitest';
import {
    collectLocalizedPatterns,
    generateConvexLocalizedPaths,
    localizedPatternsFor,
} from './codegen/emit-localized-paths';
import { generateActionWrapper } from './codegen/outputs';

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

describe('generateConvexLocalizedPaths (G4FIX-02)', () => {
    it('derives wildcarded localized paths from the editor descriptor schemas', () => {
        const header = localizedPatternsFor('header');
        // Link groups localize their LABEL leaf only (G4FIX-03) — the group
        // itself is never a bucket path.
        expect(header).toContain('cta.label');
        expect(header).not.toContain('cta');
        expect(header).toContain('items.*.description');
        expect(header).toContain('items.*.link.label');
        expect(header).not.toContain('items.*.link');
        expect(header).toContain('localeSwitcher.label');
        // A non-localized leaf never appears.
        expect(header).not.toContain('logoLink');
    });

    it('reaches localized leaves inside blocks rows, unioned across block variants', () => {
        const pages = localizedPatternsFor('pages');
        expect(pages).toContain('title');
        // The SEO group's text leaves are localized — never the group (G4FIX-03).
        expect(pages).toContain('seo.title');
        expect(pages).toContain('seo.description');
        expect(pages).toContain('seo.keywords');
        expect(pages).not.toContain('seo');
        expect(pages).toContain('blocks.*.body');
        expect(pages).toContain('blocks.*.items.*.caption');
        expect(pages).toContain('blocks.*.items.*.link.label');
    });

    it('rejects localized: true on composite kinds with a typed error (G4FIX-03)', () => {
        for (const composite of [
            { type: 'group', name: 'link', localized: true, fields: [] },
            { type: 'array', name: 'rows', localized: true, fields: [] },
            { type: 'blocks', name: 'blocks', localized: true, blocks: [] },
        ]) {
            expect(() => collectLocalizedPatterns([composite], '', new Set())).toThrowError(
                LocalizedCompositeFieldError,
            );
        }
        // The wildcarded path is embedded so the offending descriptor is findable.
        let thrown: unknown;
        try {
            collectLocalizedPatterns(
                [{ type: 'array', name: 'items', fields: [{ type: 'group', name: 'link', localized: true }] }],
                '',
                new Set(),
            );
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeInstanceOf(LocalizedCompositeFieldError);
        expect((thrown as LocalizedCompositeFieldError).description).toContain('items.*.link');
    });

    it('emits an empty list for collections without localized fields', () => {
        expect(localizedPatternsFor('businessData')).toEqual([]);
        expect(localizedPatternsFor('no-such-collection')).toEqual([]);
    });

    it('renders the generated module with the locale universe and the warning header', () => {
        const output = generateConvexLocalizedPaths();
        expect(output.split('\n')[0]).toMatch(/AUTO-GENERATED/);
        expect(output).toContain('export const CMS_REGISTERED_LOCALE_CODES');
        expect(output).toContain("'en-US',");
        expect(output).toContain('export const CMS_LOCALIZED_PATHS_BY_COLLECTION');
        expect(output).toContain("'feature-flags': [],");
    });
});
