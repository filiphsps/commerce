import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockGetAuthedPayloadCtx, mockRevalidatePath } = vi.hoisted(() => ({
    mockGetAuthedPayloadCtx: vi.fn(),
    mockRevalidatePath: vi.fn(),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/cache', () => ({
    revalidatePath: mockRevalidatePath,
}));

vi.mock('@/lib/payload-ctx', () => ({
    getAuthedPayloadCtx: mockGetAuthedPayloadCtx,
}));

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import { restoreVersionAction } from './restore-version';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const DOMAIN = 'acme.example.com';
const COLLECTION = 'businessData';
const VERSION_ID = 'version-doc-42';

const USER = {
    id: 'user-1',
    email: 'admin@example.com',
    role: 'admin' as const,
    tenants: [{ tenant: 'tenant-1' }],
    collection: 'users' as const,
};

function makePayload() {
    return {
        restoreVersion: vi.fn().mockResolvedValue({ id: 'doc-1' }),
    };
}

function makeCtx(payload: ReturnType<typeof makePayload>) {
    return {
        payload,
        user: USER,
        tenant: { id: 'tenant-1', slug: 'acme', name: 'Acme Store' },
        session: { user: { email: USER.email }, expires: '2099-01-01' },
    };
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('restoreVersionAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
    });

    it('calls payload.restoreVersion with the correct collection, versionId, user, and overrideAccess: false', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        await restoreVersionAction(DOMAIN, COLLECTION, VERSION_ID);

        expect(mockGetAuthedPayloadCtx).toHaveBeenCalledWith(DOMAIN);
        expect(payload.restoreVersion).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: COLLECTION,
                id: VERSION_ID,
                user: USER,
                overrideAccess: false,
            }),
        );
    });

    it('revalidates the default collection edit path when no redirectPath is given', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        await restoreVersionAction(DOMAIN, COLLECTION, VERSION_ID);

        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/content/${COLLECTION}/`);
    });

    it('revalidates the custom redirectPath when one is supplied', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const customPath = `/${DOMAIN}/content/business-data/`;
        await restoreVersionAction(DOMAIN, COLLECTION, VERSION_ID, customPath);

        expect(mockRevalidatePath).toHaveBeenCalledWith(customPath);
    });

    it('does not call revalidatePath when payload.restoreVersion throws', async () => {
        const payload = makePayload();
        payload.restoreVersion.mockRejectedValue(new Error('Payload access denied'));
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        await expect(restoreVersionAction(DOMAIN, COLLECTION, VERSION_ID)).rejects.toThrow(
            'Payload access denied',
        );

        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
});
