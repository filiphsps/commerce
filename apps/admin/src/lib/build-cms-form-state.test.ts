import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockBuildFormState } = vi.hoisted(() => ({
    mockBuildFormState: vi.fn(),
}));

vi.mock('@payloadcms/ui/utilities/buildFormState', () => ({
    buildFormState: mockBuildFormState,
}));

import { buildCmsFormState } from './build-cms-form-state';

describe('buildCmsFormState', () => {
    beforeEach(() => {
        mockBuildFormState.mockReset();
        mockBuildFormState.mockResolvedValue({ state: {} });
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
});
