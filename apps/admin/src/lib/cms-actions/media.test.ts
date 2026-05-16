import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockGetAuthedPayloadCtx, mockRevalidatePath, mockNotFound, mockRedirect } = vi.hoisted(() => ({
    mockGetAuthedPayloadCtx: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockNotFound: vi.fn((): never => {
        throw new Error('NEXT_NOT_FOUND');
    }),
    mockRedirect: vi.fn((url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
    redirect: mockRedirect,
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

import { createMediaAction, deleteMediaAction, updateMediaAction } from './media';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const DOMAIN = 'test-shop.com';
const MEDIA_ID = 'media-abc123';

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

const EXISTING_MEDIA = {
    id: MEDIA_ID,
    alt: 'A product image',
    caption: 'Shown on the product card',
    filename: 'product.jpg',
    mimeType: 'image/jpeg',
    filesize: 204800,
    width: 1280,
    height: 720,
    url: '/media/product.jpg',
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

function makePayload({ existingDoc = EXISTING_MEDIA as unknown }: { existingDoc?: unknown } = {}): MockPayload {
    return {
        find: vi.fn().mockResolvedValue({ docs: existingDoc ? [existingDoc] : [] }),
        findByID: vi.fn().mockResolvedValue(existingDoc),
        create: vi.fn().mockResolvedValue({ id: 'media-new' }),
        update: vi.fn().mockResolvedValue(existingDoc),
        delete: vi.fn().mockResolvedValue({}),
    };
}

function makeCtx(payload: MockPayload, user: AnyUser = ADMIN_USER, tenant: { id: string } | null = null) {
    return {
        payload,
        user,
        tenant,
        session: { user: { email: user.email }, expires: '2099-01-01' },
    };
}

const TENANT = { id: 'tenant-xyz', slug: 'test-shop', name: 'Test Shop' };

/**
 * Build a FormData containing an uploaded file plus the form fields the
 * upload page would submit. We use a real `File` so `instanceof File` and
 * `.arrayBuffer()` work the same way they do in the browser/server-action
 * boundary.
 */
function makeUploadFormData({ file, alt, caption }: { file?: File; alt?: string; caption?: string } = {}): FormData {
    const fd = new FormData();
    if (file !== undefined) fd.append('file', file);
    if (alt !== undefined) fd.append('alt', alt);
    if (caption !== undefined) fd.append('caption', caption);
    return fd;
}

const PNG_BYTES = new Uint8Array([
    // 8-byte PNG signature
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function makeTestPngFile(name = 'test.png'): File {
    return new File([PNG_BYTES], name, { type: 'image/png' });
}

/** Build a FormData with raw named fields (not `_payload` blob — media form is hand-rolled). */
function makeFormData(fields: Record<string, string>): FormData {
    const fd = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        fd.append(key, value);
    }
    return fd;
}

// ------------------------------------------------------------------
// createMediaAction
// ------------------------------------------------------------------

describe('createMediaAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('creates the doc via local API (not REST) with file, alt, caption, and tenant', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, ADMIN_USER, TENANT));

        const file = makeTestPngFile('photo.png');
        const formData = makeUploadFormData({ file, alt: 'A photo', caption: 'Nice shot' });

        const result = await createMediaAction(DOMAIN, formData);

        expect(result).toEqual({ id: 'media-new' });

        // Critical assertion for the 403 regression: the action MUST go
        // through `payload.create` (the authenticated local API) rather
        // than POSTing to `/api/media` (which the admin app's NextAuth-only
        // setup cannot authenticate).
        expect(payload.create).toHaveBeenCalledTimes(1);
        const createCall = payload.create.mock.calls[0]?.[0] as {
            collection: string;
            file: { data: Buffer; mimetype: string; name: string; size: number };
            data: { alt: string; caption?: string; tenant: string };
            user: AnyUser;
            overrideAccess: boolean;
        };

        expect(createCall.collection).toBe('media');
        expect(createCall.user).toEqual(ADMIN_USER);
        expect(createCall.overrideAccess).toBe(false);

        // File converted from browser File → Payload's `{ data: Buffer, … }` shape.
        expect(Buffer.isBuffer(createCall.file.data)).toBe(true);
        expect(createCall.file.data.byteLength).toBe(PNG_BYTES.byteLength);
        expect(createCall.file.mimetype).toBe('image/png');
        expect(createCall.file.name).toBe('photo.png');
        expect(createCall.file.size).toBe(PNG_BYTES.byteLength);

        // Tenant is set explicitly because the local API has no request
        // context for the multi-tenant plugin to pull from.
        expect(createCall.data).toEqual({ alt: 'A photo', caption: 'Nice shot', tenant: TENANT.id });

        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/settings/media/`);
    });

    it('forwards an empty caption as undefined so Payload does not store ""', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, ADMIN_USER, TENANT));

        const formData = makeUploadFormData({ file: makeTestPngFile(), alt: 'Alt only', caption: '' });
        await createMediaAction(DOMAIN, formData);

        const createCall = payload.create.mock.calls[0]?.[0] as { data: { caption?: string } };
        expect(createCall.data.caption).toBeUndefined();
    });

    it('editor role: calls notFound without creating', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, EDITOR_USER, TENANT));

        const formData = makeUploadFormData({ file: makeTestPngFile(), alt: 'Alt' });
        await expect(createMediaAction(DOMAIN, formData)).rejects.toThrow('NEXT_NOT_FOUND');

        expect(payload.create).not.toHaveBeenCalled();
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('calls notFound when no tenant is resolved', async () => {
        const payload = makePayload();
        // tenant = null — route is admin-only but cross-tenant, no tenant context.
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, ADMIN_USER, null));

        const formData = makeUploadFormData({ file: makeTestPngFile(), alt: 'Alt' });
        await expect(createMediaAction(DOMAIN, formData)).rejects.toThrow('NEXT_NOT_FOUND');

        expect(payload.create).not.toHaveBeenCalled();
    });

    it('throws when no file is provided', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, ADMIN_USER, TENANT));

        const formData = makeUploadFormData({ alt: 'Alt' }); // no file
        await expect(createMediaAction(DOMAIN, formData)).rejects.toThrow(/no file/i);

        expect(payload.create).not.toHaveBeenCalled();
    });

    it('throws when alt is missing (required on the collection)', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, ADMIN_USER, TENANT));

        const formData = makeUploadFormData({ file: makeTestPngFile() }); // no alt
        await expect(createMediaAction(DOMAIN, formData)).rejects.toThrow(/alt text is required/i);

        expect(payload.create).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// updateMediaAction
// ------------------------------------------------------------------

describe('updateMediaAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('updates the doc with alt+caption, revalidates list and detail paths', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ alt: 'Updated alt text', caption: 'New caption' });
        await updateMediaAction(DOMAIN, MEDIA_ID, formData);

        expect(payload.update).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'media',
                id: MEDIA_ID,
                data: expect.objectContaining({ alt: 'Updated alt text', caption: 'New caption' }),
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/settings/media/`);
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/settings/media/${MEDIA_ID}/`);
    });

    it('editor role: calls notFound without updating', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, EDITOR_USER));

        const formData = makeFormData({ alt: 'Alt text' });
        await expect(updateMediaAction(DOMAIN, MEDIA_ID, formData)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.update).not.toHaveBeenCalled();
        expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('does not set _status (media has no drafts)', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ alt: 'Some alt' });
        await updateMediaAction(DOMAIN, MEDIA_ID, formData);

        const updateCall = payload.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(updateCall.data).not.toHaveProperty('_status');
    });
});

// ------------------------------------------------------------------
// deleteMediaAction
// ------------------------------------------------------------------

describe('deleteMediaAction', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
        mockRedirect.mockReset().mockImplementation((url: string): never => {
            throw new Error(`NEXT_REDIRECT:${url}`);
        });
    });

    it('admin: deletes the doc, revalidates list, then redirects to /media/', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // redirect() throws so we catch it
        await expect(deleteMediaAction(DOMAIN, MEDIA_ID)).rejects.toThrow(`NEXT_REDIRECT:/${DOMAIN}/settings/media/`);

        expect(payload.delete).toHaveBeenCalledWith(
            expect.objectContaining({
                collection: 'media',
                id: MEDIA_ID,
                user: ADMIN_USER,
                overrideAccess: false,
            }),
        );
        expect(mockRevalidatePath).toHaveBeenCalledWith(`/${DOMAIN}/settings/media/`);
        expect(mockRedirect).toHaveBeenCalledWith(`/${DOMAIN}/settings/media/`);
    });

    it('editor role: calls notFound without deleting', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload, EDITOR_USER));

        await expect(deleteMediaAction(DOMAIN, MEDIA_ID)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(payload.delete).not.toHaveBeenCalled();
        expect(mockRevalidatePath).not.toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
    });
});

// ------------------------------------------------------------------
// FormData parsing (raw named fields — media uses a hand-rolled form,
// not Payload's `_payload` JSON blob).
// ------------------------------------------------------------------

describe('FormData parsing (raw named fields)', () => {
    beforeEach(() => {
        mockGetAuthedPayloadCtx.mockReset();
        mockRevalidatePath.mockReset();
        mockNotFound.mockReset().mockImplementation((): never => {
            throw new Error('NEXT_NOT_FOUND');
        });
    });

    it('forwards both alt and caption when both are present', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ alt: 'My photo', caption: 'A nice photo' });
        await updateMediaAction(DOMAIN, MEDIA_ID, formData);

        const updateCall = payload.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(updateCall.data).toEqual({ alt: 'My photo', caption: 'A nice photo' });
    });

    it('forwards alt only when caption is omitted', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ alt: 'Just alt' });
        await updateMediaAction(DOMAIN, MEDIA_ID, formData);

        const updateCall = payload.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(updateCall.data).toEqual({ alt: 'Just alt', caption: undefined });
    });

    it('drops empty-string alt to undefined so Payload does not overwrite the existing value', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        const formData = makeFormData({ alt: '' });
        await updateMediaAction(DOMAIN, MEDIA_ID, formData);

        const updateCall = payload.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(updateCall.data.alt).toBeUndefined();
    });

    it('handles a fully-empty FormData by calling update with both fields undefined', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        await updateMediaAction(DOMAIN, MEDIA_ID, new FormData());

        const updateCall = payload.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(updateCall.data).toEqual({ alt: undefined, caption: undefined });
    });

    it('ignores extra unrecognised fields in the FormData (allowlist enforced by parse)', async () => {
        const payload = makePayload();
        mockGetAuthedPayloadCtx.mockResolvedValue(makeCtx(payload));

        // The hand-rolled edit form should never submit these — but if it did
        // (or someone poked the action directly), the action must not forward
        // arbitrary keys to Payload.
        const formData = makeFormData({
            alt: 'Allowed',
            caption: 'Also allowed',
            tenant: 'forged-tenant-id',
            _status: 'published',
            file: 'should-be-ignored',
        });
        await updateMediaAction(DOMAIN, MEDIA_ID, formData);

        const updateCall = payload.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
        expect(updateCall.data).toEqual({ alt: 'Allowed', caption: 'Also allowed' });
        expect(updateCall.data).not.toHaveProperty('tenant');
        expect(updateCall.data).not.toHaveProperty('_status');
        expect(updateCall.data).not.toHaveProperty('file');
    });
});
