import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockGetAuthedPayloadCtx, mockRevalidatePath, mockNotFound } = vi.hoisted(() => ({
    mockGetAuthedPayloadCtx: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockNotFound: vi.fn((): never => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
    redirect: (url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    },
    notFound: mockNotFound,
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

import { createUserAction, deleteUserAction, updateUserAction } from './users';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const USER_ID = 'user-abc123';
const OTHER_USER_ID = 'user-other456';

const ADMIN_USER = {
    id: 'user-admin-1',
    email: 'admin@example.com',
    role: 'admin' as const,
    tenants: [],
    collection: 'users' as const,
};

const EDITOR_USER = {
    id: 'user-editor-2',
    email: 'editor@example.com',
    role: 'editor' as const,
    tenants: [],
    collection: 'users' as const,
};

const EXISTING_USER = {
    id: USER_ID,
    email: 'user@example.com',
    role: 'editor',
    tenants: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
};

type MockPayload = {
    find: ReturnType<typeof vi.fn>;
    findByID: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

type AnyUser = { id: string; email: string; role: string; tenants: unknown[]; collection: 'users' };

function makePayload({
    existingDoc = EXISTING_USER as unknown,
    createResult = { id: 'user-new' } as unknown,
}: {
    existingDoc?: unknown;
    createResult?: unknown;
} = {}): MockPayload {
    return {
        find: vi.fn().mockResolvedValue({ docs: existingDoc ? [existingDoc] : [] }),
        findByID: vi.fn().mockResolvedValue(existingDoc),
        create: vi.fn().mockResolvedValue(createResult),
        update: vi.fn().mockResolvedValue(existingDoc),
        delete: vi.fn().mockResolvedValue({ docs: [] }),
    };
}

function makeCtx(payload: MockPayload, user: AnyUser = ADMIN_USER) {
    return {
        payload,
        user,
        // tenant is null — admin routes are cross-tenant
        tenant: null,
        session: { user: { email: user.email }, expires: '2099-01-01' },
    };
}

/** Build a FormData whose `_payload` key carries the given object serialized as JSON. */
function makeFormData(data: Record<string, unknown>): FormData {
    const fd = new FormData();
    fd.append('_payload', JSON.stringify(data));
    return fd;
}

// ------------------------------------------------------------------
// createUserAction
// ------------------------------------------------------------------

describe('createUserAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('creates a user with email+role+tenants, returns id, and revalidates list', async () => {
        const payload = makePayload({ createResult: { id: 'user-new-1' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({
            email: 'new@example.com',
            role: 'editor',
            tenants: [{ tenant: 'tenant-1' }],
        });
        const result = await createUserAction(formData);

        expect(payload.create).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'users',
                data: expect.objectContaining({
                    email: 'new@example.com',
                    role: 'editor',
                    tenants: [{ tenant: 'tenant-1' }],
                }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        // Verify throwaway password is set (not the user's real password)
        const createCall = payload.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(typeof createCall.data.password).toBe('string');
        expect(createCall.data.password).not.toBe('');

        expect(result).toEqual({ id: 'user-new-1' });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/users/');
    });

    it('creates a user with no tenants when tenants is omitted', async () => {
        const payload = makePayload({ createResult: { id: 'user-new-2' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ email: 'new@example.com', role: 'admin' });
        await createUserAction(formData);

        const createCall = payload.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(createCall.data.tenants).toEqual([]);
    });

    it('throws when email is missing', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ role: 'editor' });
        await expect(createUserAction(formData)).rejects.toThrow('Email is required');
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('throws when role is missing', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ email: 'new@example.com' });
        await expect(createUserAction(formData)).rejects.toThrow('Role is required');
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('editor role: calls notFound without creating', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, EDITOR_USER));

        const formData = makeFormData({ email: 'new@example.com', role: 'editor' });
        await expect(createUserAction(formData)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.create).not.toHaveBeenCalled();
    });

    it('does not set _status (users have no drafts)', async () => {
        const payload = makePayload({ createResult: { id: 'user-x' } });
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ email: 'new@example.com', role: 'editor' });
        await createUserAction(formData);

        const createCall = payload.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(createCall.data).not.toHaveProperty('_status');
    });
});

// ------------------------------------------------------------------
// updateUserAction
// ------------------------------------------------------------------

describe('updateUserAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('updates the doc and revalidates list + detail paths', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ email: 'updated@example.com', role: 'editor' });
        await updateUserAction(OTHER_USER_ID, formData);

        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'users',
                id: OTHER_USER_ID,
                data: expect.objectContaining({ email: 'updated@example.com' }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith('/users/');
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/users/${OTHER_USER_ID}/`);
    });

    it('editor role: calls notFound without updating', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, EDITOR_USER));

        const formData = makeFormData({ email: 'updated@example.com', role: 'editor' });
        await expect(updateUserAction(OTHER_USER_ID, formData)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.update).not.toHaveBeenCalled();
    });

    it('self-demotion: throws when admin tries to set own role to editor', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // ADMIN_USER.id === 'user-admin-1', updating themselves to editor
        const formData = makeFormData({ email: ADMIN_USER.email, role: 'editor' });
        await expect(updateUserAction(ADMIN_USER.id, formData)).rejects.toThrow(
            'Admins cannot demote themselves.',
        );
        expect(payload.update).not.toHaveBeenCalled();
    });

    it('allows admin to update own email without changing role', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // Admin updates their own email but role is undefined (not being changed)
        const formData = makeFormData({ email: 'new-admin@example.com' });
        await updateUserAction(ADMIN_USER.id, formData);

        expect(payload.update).toHaveBeenCalled();
    });

    it('allows admin to update another admin to editor', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // Admin is updating a *different* user (OTHER_USER_ID) to editor — allowed
        const formData = makeFormData({ role: 'editor' });
        await updateUserAction(OTHER_USER_ID, formData);

        expect(payload.update).toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// deleteUserAction
// ------------------------------------------------------------------

describe('deleteUserAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('admin: calls delete and revalidates list', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        await deleteUserAction(OTHER_USER_ID);

        expect(payload.delete).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'users',
                id: OTHER_USER_ID,
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith('/users/');
    });

    it('editor role: calls notFound without deleting', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, EDITOR_USER));

        await expect(deleteUserAction(OTHER_USER_ID)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.delete).not.toHaveBeenCalled();
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('self-delete: throws when admin tries to delete themselves', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // ADMIN_USER.id is the same as the id passed in
        await expect(deleteUserAction(ADMIN_USER.id)).rejects.toThrow('Admins cannot delete themselves.');
        expect(payload.delete).not.toHaveBeenCalled();
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// FormData parsing (_payload JSON blob)
// ------------------------------------------------------------------

describe('FormData parsing (_payload JSON blob)', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('treats a missing _payload key as an empty submission (no error)', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = new FormData(); // no _payload
        await updateUserAction(OTHER_USER_ID, formData);

        // Should still call update with empty parsed data, not throw
        expect(payload.update).toHaveBeenCalled();
    });

    it('throws when _payload contains invalid JSON', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = new FormData();
        formData.append('_payload', '{ this is not: valid json');

        const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            await expect(updateUserAction(OTHER_USER_ID, formData)).rejects.toThrow('Malformed form payload');
        } finally {
            consoleErrSpy.mockRestore();
        }

        expect(payload.update).not.toHaveBeenCalled();
    });

    it('drops tenants that are not objects with a string tenant field', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({
            email: 'test@example.com',
            role: 'editor',
            // Mix of valid, invalid, and edge-case tenant entries
            tenants: [
                { tenant: 'valid-tenant-id' },
                { tenant: 123 },               // number — not a string
                'bare-string',                  // not an object
                null,                           // null
                { noTenantKey: 'oops' },        // wrong key
            ],
        });

        await updateUserAction(OTHER_USER_ID, formData);

        const updateCall = payload.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        // Only the valid entry survives sanitization
        expect(updateCall.data.tenants).toEqual([{ tenant: 'valid-tenant-id' }]);
    });

    it('handles tenants as a non-array (silently drops)', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({
            email: 'test@example.com',
            role: 'editor',
            tenants: 'not-an-array',
        });

        await updateUserAction(OTHER_USER_ID, formData);

        const updateCall = payload.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        // Non-array tenants becomes undefined in parsed data (not forwarded)
        expect(updateCall.data.tenants).toBeUndefined();
    });
});
