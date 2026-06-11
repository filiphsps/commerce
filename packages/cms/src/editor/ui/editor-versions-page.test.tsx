// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import type { Route } from 'next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EditorActions } from '../actions';
import { defineCollectionEditor } from '../manifest';
import type { EditorCmsDocument, EditorCmsVersion } from '../runtime';

const { mockNotFound, mockRedirect } = vi.hoisted(() => ({
    mockNotFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
    mockRedirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));
vi.mock('next/navigation', () => ({
    notFound: mockNotFound,
    redirect: mockRedirect,
    useRouter: () => ({ replace: vi.fn() }),
    usePathname: () => '/a.test/content/business-data/',
    useSearchParams: () => new URLSearchParams('locale=de'),
}));

import { EditorVersionsPage } from './editor-versions-page';

const manifest = defineCollectionEditor({
    collection: 'businessData',
    routes: {
        label: { singular: 'Business data', plural: 'Business data' },
        basePath: (d) => `/${d}/content/business-data/` as Route,
    },
    tenant: { kind: 'tenant-singleton', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true },
});

const generatedActions: EditorActions = {
    saveDraft: async () => ({}),
    publish: async () => {},
    delete: async () => {},
    create: async () => ({ id: 'new' }),
    bulkDelete: async () => {},
    bulkPublish: async () => {},
    restoreVersion: async () => {},
};

const liveDoc: EditorCmsDocument = {
    documentId: 'd1',
    collection: 'businessData',
    data: { legalName: 'Acme' },
    status: 'draft',
    updatedAt: 1_700_000_000_000,
    latestVersionId: 'v2',
};

/**
 * Build the runtime substrate with a Convex bridge resolving the given live
 * document and version history — the CMSDATA-07 read seam under test.
 *
 * @param doc - The live document `getDocument` resolves, or `null`.
 * @param versions - The `listVersions` history, oldest first (the Convex order).
 * @returns The runtime, typed loosely for the page under test.
 */
const buildRuntime = (doc: EditorCmsDocument | null, versions: EditorCmsVersion[]): never =>
    ({
        getCtx: async () => ({
            user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
            tenant: { id: 'tenant-1', slug: 'acme', defaultLocale: 'de', locales: ['de', 'en'] },
        }),
        toAccessCtx: (_ctx: never, domain: string | null) => ({ user: null, domain }),
        convex: {
            getDocument: async () => doc,
            listVersions: async () => versions,
        },
        DocumentForm: () => null,
        Table: () => null,
        Toolbar: () => null,
        PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
        buildFormState: async () => ({ state: {} }),
    }) as never;

describe('<EditorVersionsPage>', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders an empty state when no versions exist', async () => {
        const el = await EditorVersionsPage({
            manifest,
            runtime: buildRuntime(liveDoc, []),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'de' },
            generatedActions,
        });
        const { container } = render(el);
        // Plain DOM access — no jest-dom.
        expect(container.textContent).toMatch(/no version history/i);
        expect(screen.getByRole('heading', { level: 1, name: /Versions/ })).toBeDefined();
    });

    it('renders an empty state when the document does not exist yet', async () => {
        const el = await EditorVersionsPage({
            manifest,
            runtime: buildRuntime(null, []),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'de' },
            generatedActions,
        });
        const { container } = render(el);
        expect(container.textContent).toMatch(/no version history/i);
    });

    it('renders one row per version, newest first, marking the latest as Current', async () => {
        const versions: EditorCmsVersion[] = [
            { versionId: 'v1', status: 'published', createdAt: Date.UTC(2026, 4, 15, 10) },
            { versionId: 'v2', status: 'draft', createdAt: Date.UTC(2026, 4, 15, 12) },
        ];
        const el = await EditorVersionsPage({
            manifest,
            runtime: buildRuntime(liveDoc, versions),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'de' },
            generatedActions,
        });
        const { container } = render(el);
        const rows = container.querySelectorAll('li');
        expect(rows).toHaveLength(2);
        // Newest (v2 — the live doc's latestVersionId) renders first and is Current.
        expect(rows[0]?.textContent).toContain('Current');
        expect(rows[0]?.querySelector('button')?.hasAttribute('disabled')).toBe(true);
        expect(rows[1]?.textContent).not.toContain('Current');
        expect(rows[1]?.querySelector('button')?.hasAttribute('disabled')).toBe(false);
    });

    it('shows the stamped author with a locale-aware relative time, and an em-dash for pre-stamp rows', async () => {
        // Pin "now" so the relative phrases are deterministic.
        vi.useFakeTimers();
        vi.setSystemTime(Date.UTC(2026, 4, 15, 13));
        const versions: EditorCmsVersion[] = [
            // A migrated/pre-stamp row: no author was recorded and none is backfilled.
            { versionId: 'v1', status: 'published', createdAt: Date.UTC(2026, 4, 13, 13) },
            {
                versionId: 'v2',
                status: 'draft',
                createdAt: Date.UTC(2026, 4, 15, 12),
                author: { userId: 'u1', label: 'Ada Lovelace' },
            },
        ];
        const el = await EditorVersionsPage({
            manifest,
            runtime: buildRuntime(liveDoc, versions),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'de' },
            generatedActions,
        });
        const { container } = render(el);
        const rows = container.querySelectorAll('li');
        // Newest first: the stamped row renders its author and the German relative phrase…
        expect(rows[0]?.textContent).toContain('Ada Lovelace');
        expect(rows[0]?.textContent).toContain('vor 1 Stunde');
        // …while the pre-stamp row degrades to a quiet em-dash, never an error state. The German
        // `numeric: 'auto'` idiom for a two-day delta is "vorgestern".
        expect(rows[1]?.textContent).toContain('—');
        expect(rows[1]?.textContent).toContain('vorgestern');
    });

    it('resolves locale switcher labels in the active locale, not hardcoded English', async () => {
        const el = await EditorVersionsPage({
            manifest,
            runtime: buildRuntime(liveDoc, []),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'de' },
            generatedActions,
        });
        const { container } = render(el);
        const options = [...container.querySelectorAll('select#locale-switcher option')].map((o) => o.textContent);
        // Active locale is `de`, so labels are German display names.
        expect(options.some((text) => text?.includes('Deutsch'))).toBe(true);
        expect(options.some((text) => text?.includes('Englisch'))).toBe(true);
    });

    it('redirects to tenant.defaultLocale when searchParams.locale is missing', async () => {
        await expect(
            EditorVersionsPage({
                manifest,
                runtime: buildRuntime(liveDoc, []),
                params: { domain: 'a.test', id: '' },
                searchParams: {},
                generatedActions,
            }),
        ).rejects.toThrow(/NEXT_REDIRECT:.*locale=de/);
    });

    it('renders the locale switcher in the header when tenant has multiple locales', async () => {
        const el = await EditorVersionsPage({
            manifest,
            runtime: buildRuntime(liveDoc, []),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'de' },
            generatedActions,
        });
        const { container } = render(el);
        expect(container.querySelector('select#locale-switcher')).not.toBeNull();
    });
});
