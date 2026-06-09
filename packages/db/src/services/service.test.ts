import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BaseDocument } from '../db';
import { Service, type ServiceBackend } from './service';

type TestDoc = BaseDocument & { name?: string };

const docA = { id: '123', name: 'John Doe' } as TestDoc;
const docB = { id: '456', name: 'Jane Doe' } as TestDoc;

/**
 * Builds a fully-mocked backend so the base `Service` contract — the part SFREAD-02 freezes — is
 * exercised in isolation from any transport.
 *
 * @returns The mocked backend with every method as a `vi.fn()`.
 */
const makeBackend = () => ({
    name: 'TestDoc',
    create: vi.fn(),
    findMany: vi.fn(),
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('Service (Convex-backed base contract)', () => {
    describe('create', () => {
        it('delegates to the backend and resolves the stored document', async () => {
            const backend = makeBackend();
            backend.create.mockResolvedValueOnce(docA);
            const service = new Service<TestDoc>(backend as unknown as ServiceBackend<TestDoc>);

            const input = { name: 'John Doe' } as Omit<TestDoc, keyof BaseDocument>;
            const result = await service.create(input);

            expect(backend.create).toHaveBeenCalledWith(input);
            expect(result).toBe(docA);
        });
    });

    describe('find', () => {
        it('returns every document for a multi-result lookup', async () => {
            const backend = makeBackend();
            backend.findMany.mockResolvedValueOnce([docA, docB]);
            const service = new Service<TestDoc>(backend as unknown as ServiceBackend<TestDoc>);

            const result = await service.find({ filter: { name: 'Doe' } });

            expect(backend.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ filter: { name: 'Doe' }, id: undefined, count: undefined }),
            );
            expect(result).toHaveLength(2);
        });

        it('returns the first document for a count:1 lookup', async () => {
            const backend = makeBackend();
            backend.findMany.mockResolvedValueOnce([docA, docB]);
            const service = new Service<TestDoc>(backend as unknown as ServiceBackend<TestDoc>);

            const result = await service.find({ filter: { name: 'John Doe' }, count: 1 });
            expect(result.id).toEqual('123');
        });

        // Single-result overload (`count: 1` or `id`) promises `Promise<DocType>`. Returning `[]`
        // on an empty match was a type lie that crashed every caller awaiting one document — the
        // auth adapter, the storefront's `Shop.findByDomain`. Throw `NotFoundError` so the
        // documented adapter contract (handle `NotFoundError` ⇒ return `null`) actually fires.
        //
        // Matched on `error.name` rather than `instanceof`: the errors package ships both `src`
        // and `dist` builds and Vitest can load the two class identities via different paths.
        it('throws NotFoundError when a count:1 query has no matches', async () => {
            const backend = makeBackend();
            backend.findMany.mockResolvedValueOnce([]);
            const service = new Service<TestDoc>(backend as unknown as ServiceBackend<TestDoc>);

            await expect(service.find({ filter: { name: 'Nobody' }, count: 1 })).rejects.toMatchObject({
                name: 'NotFoundError',
            });
        });

        it('throws NotFoundError when an id query has no matches', async () => {
            const backend = makeBackend();
            backend.findMany.mockResolvedValueOnce([]);
            const service = new Service<TestDoc>(backend as unknown as ServiceBackend<TestDoc>);

            await expect(service.find({ id: 'missing-id' })).rejects.toMatchObject({ name: 'NotFoundError' });
        });

        it('returns [] when a multi-result query has no matches', async () => {
            const backend = makeBackend();
            backend.findMany.mockResolvedValueOnce([]);
            const service = new Service<TestDoc>(backend as unknown as ServiceBackend<TestDoc>);

            const result = await service.find({ filter: { name: 'Nobody' } });
            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('forwards id and projection to the backend', async () => {
            const backend = makeBackend();
            backend.findById.mockResolvedValueOnce(docA);
            const service = new Service<TestDoc>(backend as unknown as ServiceBackend<TestDoc>);

            await service.findById('123', { name: 1 }, { lean: true });
            expect(backend.findById).toHaveBeenCalledWith('123', { name: 1 }, { lean: true });
        });

        it('resolves to null when the backend has no match', async () => {
            const backend = makeBackend();
            backend.findById.mockResolvedValueOnce(null);
            const service = new Service<TestDoc>(backend as unknown as ServiceBackend<TestDoc>);

            await expect(service.findById('missing')).resolves.toBeNull();
        });
    });

    describe('findOneAndUpdate', () => {
        it('forwards filter, update, and options to the backend', async () => {
            const backend = makeBackend();
            backend.findOneAndUpdate.mockResolvedValueOnce(docA);
            const service = new Service<TestDoc>(backend as unknown as ServiceBackend<TestDoc>);

            const filter = { name: 'John Doe' };
            const update = { name: 'John D.' };
            const options = { upsert: true, new: true };
            const result = await service.findOneAndUpdate(filter, update, options);

            expect(backend.findOneAndUpdate).toHaveBeenCalledWith(filter, update, options);
            expect(result).toBe(docA);
        });

        it('resolves to null when no document matched', async () => {
            const backend = makeBackend();
            backend.findOneAndUpdate.mockResolvedValueOnce(null);
            const service = new Service<TestDoc>(backend as unknown as ServiceBackend<TestDoc>);

            await expect(service.findOneAndUpdate({ name: 'x' }, { name: 'y' })).resolves.toBeNull();
        });
    });
});
