import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockBuildFormState, mockGetFieldByPath } = vi.hoisted(() => ({
    mockBuildFormState: vi.fn(),
    mockGetFieldByPath: vi.fn(),
}));

vi.mock('@payloadcms/ui/utilities/buildFormState', () => ({
    buildFormState: mockBuildFormState,
}));

vi.mock('payload', () => ({
    getFieldByPath: mockGetFieldByPath,
}));

import { __resetLoggedMocksForTests, buildCmsFormState, scanFormStateForMocks } from './build-cms-form-state';

describe('buildCmsFormState', () => {
    beforeEach(() => {
        mockBuildFormState.mockReset();
        mockBuildFormState.mockResolvedValue({ state: {} });
        mockGetFieldByPath.mockReset();
        __resetLoggedMocksForTests();
    });

    it('forces renderAllFields: false (no server-side RSC tree render)', async () => {
        await buildCmsFormState({
            collectionSlug: 'pages',
            data: {},
            docPermissions: { create: true, fields: true, read: true, readVersions: true, update: true } as never,
            docPreferences: { fields: {} },
            req: {} as never,
            schemaPath: 'pages',
            skipValidation: true,
        });

        expect(mockBuildFormState).toHaveBeenCalledWith(
            expect.objectContaining({
                renderAllFields: false,
            }),
        );
    });

    it('forces mockRSCs: true so partial renders never hit a missing importMap', async () => {
        await buildCmsFormState({
            collectionSlug: 'header',
            data: {},
            docPermissions: { create: true, fields: true, read: true, readVersions: true, update: true } as never,
            docPreferences: { fields: {} },
            req: {} as never,
            schemaPath: 'header',
            skipValidation: true,
        });

        expect(mockBuildFormState).toHaveBeenCalledWith(
            expect.objectContaining({
                mockRSCs: true,
            }),
        );
    });

    it('passes the caller args through unchanged', async () => {
        const docPermissions = { create: true, fields: true, read: true, readVersions: true, update: true } as never;
        const docPreferences = { fields: {} };
        const req = { i18n: 'en' } as never;

        await buildCmsFormState({
            collectionSlug: 'articles',
            data: { title: 'Hello' },
            id: 'abc',
            operation: 'update',
            docPermissions,
            docPreferences,
            locale: 'en-US',
            req,
            schemaPath: 'articles',
            skipValidation: true,
        });

        expect(mockBuildFormState).toHaveBeenCalledWith(
            expect.objectContaining({
                collectionSlug: 'articles',
                data: { title: 'Hello' },
                id: 'abc',
                operation: 'update',
                docPermissions,
                docPreferences,
                locale: 'en-US',
                req,
                schemaPath: 'articles',
                skipValidation: true,
            }),
        );
    });

    it('returns the underlying buildFormState result', async () => {
        const sentinelState = { title: { value: 'Hi', valid: true, errors: [] } };
        mockBuildFormState.mockResolvedValue({ state: sentinelState });

        const result = await buildCmsFormState({
            collectionSlug: 'pages',
            data: {},
            docPermissions: { create: true, fields: true, read: true, readVersions: true, update: true } as never,
            docPreferences: { fields: {} },
            req: {} as never,
            schemaPath: 'pages',
            skipValidation: true,
        });

        expect(result.state).toBe(sentinelState);
    });

    describe('unsupported-field logging', () => {
        let warn: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        });
        afterEach(() => {
            warn.mockRestore();
        });

        function reqWith(flattenedFields: Array<{ name: string; type: string }>): never {
            return {
                payload: { collections: { pages: { config: { flattenedFields } } } },
            } as never;
        }

        it('warns once per (collection, path, slot) triple when fields render as Mock', async () => {
            mockBuildFormState.mockResolvedValue({
                state: {
                    title: { customComponents: { Field: 'Mock' } },
                    body: { customComponents: { Field: 'Mock', Label: 'Mock' } },
                },
            });
            mockGetFieldByPath.mockImplementation(({ path }: { path: string }) => ({
                field: { type: path === 'body' ? 'richText' : 'text' },
            }));

            await buildCmsFormState({
                collectionSlug: 'pages',
                data: {},
                docPermissions: {} as never,
                docPreferences: { fields: {} },
                req: reqWith([{ name: 'title', type: 'text' }]),
                schemaPath: 'pages',
            });

            const messages = warn.mock.calls.map((args: unknown[]) => String(args[0]));
            expect(messages).toEqual([
                expect.stringContaining('collection=pages path=body type=richText slot=Field'),
                expect.stringContaining('collection=pages path=body type=richText slot=Label'),
                expect.stringContaining('collection=pages path=title type=text slot=Field'),
            ]);
        });

        it('does not re-warn on subsequent calls for the same triple (process-scoped dedupe)', async () => {
            mockBuildFormState.mockResolvedValue({
                state: { body: { customComponents: { Field: 'Mock' } } },
            });
            mockGetFieldByPath.mockReturnValue({ field: { type: 'richText' } });

            const args = {
                collectionSlug: 'pages',
                data: {},
                docPermissions: {} as never,
                docPreferences: { fields: {} },
                req: reqWith([{ name: 'body', type: 'richText' }]),
                schemaPath: 'pages',
            } as const;

            await buildCmsFormState(args);
            await buildCmsFormState(args);

            expect(warn).toHaveBeenCalledTimes(1);
        });

        it('strips row indices so array/blocks rows log under their schema path', async () => {
            mockBuildFormState.mockResolvedValue({
                state: {
                    'hero.0.copy': { customComponents: { Field: 'Mock' } },
                    'hero.1.copy': { customComponents: { Field: 'Mock' } },
                    hero: {
                        rows: [{ customComponents: { RowLabel: 'Mock' } }, { customComponents: { RowLabel: 'Mock' } }],
                    },
                },
            });
            mockGetFieldByPath.mockReturnValue({ field: { type: 'richText' } });

            await buildCmsFormState({
                collectionSlug: 'pages',
                data: {},
                docPermissions: {} as never,
                docPreferences: { fields: {} },
                req: reqWith([{ name: 'hero', type: 'array' }]),
                schemaPath: 'pages',
            });

            const messages = warn.mock.calls.map((args: unknown[]) => String(args[0]));
            expect(messages).toEqual([
                expect.stringContaining('path=hero type=richText slot=RowLabel'),
                expect.stringContaining('path=hero.copy type=richText slot=Field'),
            ]);
        });

        it('logs type=unknown when the field cannot be resolved from the collection config', async () => {
            mockBuildFormState.mockResolvedValue({
                state: { mystery: { customComponents: { Field: 'Mock' } } },
            });
            mockGetFieldByPath.mockReturnValue(null);

            await buildCmsFormState({
                collectionSlug: 'pages',
                data: {},
                docPermissions: {} as never,
                docPreferences: { fields: {} },
                req: reqWith([]),
                schemaPath: 'pages',
            });

            expect(warn).toHaveBeenCalledWith(expect.stringContaining('path=mystery type=unknown slot=Field'));
        });

        it('skips logging entirely for non-collection (global/widget) form states', async () => {
            mockBuildFormState.mockResolvedValue({
                state: { body: { customComponents: { Field: 'Mock' } } },
            });

            await buildCmsFormState({
                globalSlug: 'site-settings',
                data: {},
                docPermissions: {} as never,
                docPreferences: { fields: {} },
                req: {} as never,
                schemaPath: 'site-settings',
            } as never);

            expect(warn).not.toHaveBeenCalled();
        });

        it('strips _status form state and suppresses its warning (Payload Field:false sentinel)', async () => {
            mockBuildFormState.mockResolvedValue({
                state: {
                    title: { customComponents: { Field: 'Mock' }, value: 'Hi' },
                    _status: { customComponents: { Field: 'Mock' }, value: 'draft' },
                },
            });
            const fields = [
                { name: 'title', type: 'text' },
                { name: '_status', type: 'select', admin: { components: { Field: false } } },
            ];
            mockGetFieldByPath.mockImplementation(({ path }: { path: string }) => {
                const match = fields.find((f) => f.name === path);
                return match ? { field: match } : null;
            });

            const result = await buildCmsFormState({
                collectionSlug: 'pages',
                data: {},
                docPermissions: {} as never,
                docPreferences: { fields: {} },
                req: { payload: { collections: { pages: { config: { flattenedFields: fields } } } } } as never,
                schemaPath: 'pages',
            });

            expect(Object.keys(result.state).sort()).toEqual(['title']);
            const messages = warn.mock.calls.map((args: unknown[]) => String(args[0]));
            expect(messages).toEqual([expect.stringContaining('path=title type=text slot=Field')]);
        });

        it('strips the multi-tenant tenant form state and suppresses its warning', async () => {
            mockBuildFormState.mockResolvedValue({
                state: {
                    title: { customComponents: { Field: 'Mock' }, value: 'Hi' },
                    tenant: { customComponents: { Field: 'Mock' }, value: 'tenant-id' },
                },
            });
            const fields = [
                { name: 'title', type: 'text' },
                {
                    name: 'tenant',
                    type: 'relationship',
                    admin: {
                        position: 'sidebar',
                        components: { Field: { path: '@payloadcms/plugin-multi-tenant/client#TenantField' } },
                    },
                },
            ];
            mockGetFieldByPath.mockImplementation(({ path }: { path: string }) => {
                const match = fields.find((f) => f.name === path);
                return match ? { field: match } : null;
            });

            const result = await buildCmsFormState({
                collectionSlug: 'pages',
                data: {},
                docPermissions: {} as never,
                docPreferences: { fields: {} },
                req: { payload: { collections: { pages: { config: { flattenedFields: fields } } } } } as never,
                schemaPath: 'pages',
            });

            expect(Object.keys(result.state).sort()).toEqual(['title']);
            const messages = warn.mock.calls.map((args: unknown[]) => String(args[0]));
            expect(messages).toEqual([expect.stringContaining('path=title type=text slot=Field')]);
        });

        it('strips both _status and the multi-tenant tenant together (realistic header collection)', async () => {
            // Mirrors `packages/cms/src/collections/_globals/header.ts` after
            // the multi-tenant plugin and versions.drafts have augmented it.
            mockBuildFormState.mockResolvedValue({
                state: {
                    logo: { customComponents: { Field: 'Mock' }, value: 'logo-id' },
                    nav: { value: [] },
                    _status: { customComponents: { Field: 'Mock' }, value: 'draft' },
                    tenant: { customComponents: { Field: 'Mock' }, value: 'tenant-id' },
                },
            });
            const fields = [
                { name: 'logo', type: 'upload' },
                { name: 'nav', type: 'array' },
                { name: '_status', type: 'select', admin: { components: { Field: false } } },
                {
                    name: 'tenant',
                    type: 'relationship',
                    admin: {
                        position: 'sidebar',
                        components: { Field: { path: '@payloadcms/plugin-multi-tenant/client#TenantField' } },
                    },
                },
            ];
            mockGetFieldByPath.mockImplementation(({ path }: { path: string }) => {
                const match = fields.find((f) => f.name === path);
                return match ? { field: match } : null;
            });

            const result = await buildCmsFormState({
                collectionSlug: 'header',
                data: {},
                docPermissions: {} as never,
                docPreferences: { fields: {} },
                req: { payload: { collections: { header: { config: { flattenedFields: fields } } } } } as never,
                schemaPath: 'header',
            });

            expect(Object.keys(result.state).sort()).toEqual(['logo', 'nav']);
            const messages = warn.mock.calls.map((args: unknown[]) => String(args[0]));
            // Only the upload field's mock warning survives — the hidden
            // pair contributes neither a state entry nor a warning.
            expect(messages).toEqual([expect.stringContaining('path=logo type=upload slot=Field')]);
        });

        it('leaves a non-hidden custom-Field component in place (it still warns and stays in state)', async () => {
            mockBuildFormState.mockResolvedValue({
                state: {
                    body: { customComponents: { Field: 'Mock' }, value: '' },
                },
            });
            const fields = [
                {
                    name: 'body',
                    type: 'richText',
                    admin: { components: { Field: { path: '@/components/cms/rich-text-field' } } },
                },
            ];
            mockGetFieldByPath.mockImplementation(({ path }: { path: string }) => {
                const match = fields.find((f) => f.name === path);
                return match ? { field: match } : null;
            });

            const result = await buildCmsFormState({
                collectionSlug: 'pages',
                data: {},
                docPermissions: {} as never,
                docPreferences: { fields: {} },
                req: { payload: { collections: { pages: { config: { flattenedFields: fields } } } } } as never,
                schemaPath: 'pages',
            });

            expect(Object.keys(result.state)).toEqual(['body']);
            const messages = warn.mock.calls.map((args: unknown[]) => String(args[0]));
            expect(messages).toEqual([expect.stringContaining('path=body type=richText slot=Field')]);
        });
    });
});

describe('scanFormStateForMocks', () => {
    it('returns an empty list when nothing was mocked', () => {
        expect(
            scanFormStateForMocks({
                title: { value: 'Hi', customComponents: { Field: 'real' as never } },
            } as never),
        ).toEqual([]);
    });

    it('captures every customComponents slot Payload replaced with the literal Mock string', () => {
        const state = {
            title: { customComponents: { Field: 'Mock', Label: 'Mock', Error: 'Mock' } },
            body: { customComponents: { Field: 'Mock' } },
        } as never;

        expect(scanFormStateForMocks(state)).toEqual([
            { path: 'body', slot: 'Field' },
            { path: 'title', slot: 'Error' },
            { path: 'title', slot: 'Field' },
            { path: 'title', slot: 'Label' },
        ]);
    });

    it('captures row-label mocks once per array/blocks field', () => {
        const state = {
            hero: {
                rows: [
                    { customComponents: { RowLabel: 'Mock' } },
                    { customComponents: { RowLabel: 'Mock' } },
                    { customComponents: { RowLabel: 'Mock' } },
                ],
            },
        } as never;

        expect(scanFormStateForMocks(state)).toEqual([{ path: 'hero', slot: 'RowLabel' }]);
    });
});
