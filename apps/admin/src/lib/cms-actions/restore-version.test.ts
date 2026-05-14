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

// `redirect` is mocked as a sentinel-throwing function rather than a resettable
// `vi.fn()`. The trade-off is we can't `toHaveBeenCalledWith` on it — instead,
// every test asserts on the sentinel error string thrown, which is strictly
// stronger (it proves the action called redirect with the right path AND
// halted execution at that point). Same pattern as `payload-ctx.test.ts`.
vi.mock('next/navigation', () => ({
    redirect: (url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    },
    notFound: (): never => {
        throw new Error('NEXT_NOT_FOUND');
    },
}));

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

        // `redirect()` throws — wrap the call so we can still inspect the
        // side-effects on `payload.restoreVersion`.
        await expect(restoreVersionAction(DOMAIN, COLLECTION, VERSION_ID)).rejects.toThrow(
            `NEXT_REDIRECT:/${DOMAIN}/content/${COLLECTION}/versions/`,
        );

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

    it('revalidates BOTH the edit route and the versions list, then redirects to versions', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        await expect(restoreVersionAction(DOMAIN, COLLECTION, VERSION_ID)).rejects.toThrow(
            `NEXT_REDIRECT:/${DOMAIN}/content/${COLLECTION}/versions/`,
        );

        // Both paths revalidated, in order: edit route first, versions list second.
        expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
        expect(mockRevalidatePath).toHaveBeenNthCalledWith(1, `/${DOMAIN}/content/${COLLECTION}/`);
        expect(mockRevalidatePath).toHaveBeenNthCalledWith(2, `/${DOMAIN}/content/${COLLECTION}/versions/`);
    });

    it('ignores any trailing FormData (the param exists only to satisfy the <form action> typing)', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // The form binds (domain, collection, versionId) and Next then passes
        // FormData as the trailing positional arg. We don't read it — every
        // input is captured through the positional bind. Verify the action
        // still calls payload.restoreVersion with the same args regardless.
        const fakeFormData = new FormData();
        fakeFormData.append('attacker-controlled', 'evil-value');

        await expect(restoreVersionAction(DOMAIN, COLLECTION, VERSION_ID, fakeFormData)).rejects.toThrow(
            `NEXT_REDIRECT:/${DOMAIN}/content/${COLLECTION}/versions/`,
        );

        expect(payload.restoreVersion).toHaveBeenCalledWith(
            expect.objectContaining({ collection: COLLECTION, id: VERSION_ID, user: USER, overrideAccess: false }),
        );
    });

    it('does not call revalidatePath or redirect when payload.restoreVersion throws', async () => {
        const payload = makePayload();
        payload.restoreVersion.mockRejectedValue(new Error('Payload access denied'));
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // The thrown error is the genuine Payload failure — NOT a NEXT_REDIRECT
        // sentinel. If the action accidentally revalidated/redirected before
        // awaiting the restore, this assertion would surface that bug.
        await expect(restoreVersionAction(DOMAIN, COLLECTION, VERSION_ID)).rejects.toThrow(
            'Payload access denied',
        );

        expect(mockRevalidatePath).not.toHaveBeenCalled();
        // We can't directly assert `redirect` was not called (it's a static throw,
        // not a vi.fn), but the rejected error above proves the rejection came
        // from `payload.restoreVersion` — a redirect would have produced a
        // `NEXT_REDIRECT:...` sentinel string instead.
    });
});
