import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `Identity`, `Session`, and `User` are plain `Service<DocType, Model>`
// singletons with no overrides, so this file pins the base `Service` contract
// as exercised through the REAL exported instances (service.test.ts covers a
// freshly-constructed `new Service(model)`; these three exported singletons had
// no characterization of their own). Mongoose connects at module load
// (`src/db.ts`), so mock it: `Schema`/`Types` stay real via `importActual`,
// while `connect` returns a connection whose `models` proxy hands back the same
// chainable `MockModel` for every name. Each test reassigns
// `mockQuery.exec.mockResolvedValueOnce(...)` to drive a case.
const mockQuery = vi.hoisted(() => ({
    limit: vi.fn(),
    sort: vi.fn(),
    exec: vi.fn(),
}));

vi.mock('mongoose', async () => {
    mockQuery.limit.mockReturnValue(mockQuery);
    mockQuery.sort.mockReturnValue(mockQuery);

    // A plain object literal rather than a static-only class (which trips
    // Biome `noStaticOnlyClass`); the base `Service` only ever reads these
    // members statically off the model.
    const MockModel = {
        modelName: 'MockModel',
        find: vi.fn().mockReturnValue(mockQuery),
        findById: vi.fn().mockReturnValue(mockQuery),
        findOneAndUpdate: vi.fn().mockReturnValue(mockQuery),
        create: vi.fn().mockResolvedValue({ id: 'created' }),
    };

    const values = {
        connect: vi.fn().mockResolvedValue({
            get models() {
                return new Proxy([], { get: () => MockModel });
            },
        }),
        set: vi.fn(),
    };

    return {
        ...(((await vi.importActual('mongoose')) as object) || {}),
        Model: MockModel,
        Document: {},
        ...values,
        connect: vi.fn().mockResolvedValue(values),
        default: { ...values },
    };
});

import type { Model } from 'mongoose';

import type { BaseDocument } from '../db';
import { Identity } from './identity';
import type { Service } from './service';
import { Session } from './session';
import { User } from './user';

beforeEach(() => {
    mockQuery.exec.mockReset();
    mockQuery.limit.mockClear();
    mockQuery.sort.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

// All three are the same `Service` class bound to a different model, so the
// base contract is identical; running each through `describe.each` proves every
// exported singleton is correctly wired rather than asserting it on only one.
//
// Type the rows to a shared `Service<{ id: string }, any>` supertype rather
// than `as const`: `as const` would infer `service` as the UNION of the three
// distinct `Service<…>` instantiations, and the overloaded `.find` is not
// callable on that union (TS2349). A common base view is faithful here because
// every row is the same `Service` class — only the model binding differs, which
// the base-contract assertions below do not depend on.
//
// The shared view is `Service<BaseDocument, typeof Model>`: `BaseDocument`
// satisfies the `DocType extends BaseDocument` constraint on the class (a bare
// `{ id: string }` would not — `BaseDocument` is a full Mongoose `Document`),
// and the model type-arg only shapes the unused `model` getter.
const services: ReadonlyArray<readonly [string, Service<BaseDocument, typeof Model>]> = [
    ['Identity', Identity],
    ['Session', Session],
    ['User', User],
];

describe.each(services)('%s base Service contract (characterization)', (name, service) => {
    // Each `it` title embeds `name` so the singleton under test is named in the
    // assertion output. This is a genuine read of the `describe.each` row name,
    // so the unused-parameter rule holds without underscore suppression (which
    // CLAUDE.md forbids outside rest patterns).
    /**
     * The single-document overload (`{ id }` or `count: 1`) promises
     * `Promise<DocType>`, so an empty match must throw rather than return `[]`.
     * Matched on `error.name` because the errors package ships both `src` and
     * `dist` builds and Vitest can load the two class identities via different
     * paths; the `name` field is identical across both.
     */
    it(`${name}: throws NotFoundError when an id lookup has no match`, async () => {
        mockQuery.exec.mockResolvedValueOnce([]);
        await expect(service.find({ id: 'missing' })).rejects.toMatchObject({ name: 'NotFoundError' });
    });

    it(`${name}: throws NotFoundError when a count:1 lookup has no match`, async () => {
        mockQuery.exec.mockResolvedValueOnce([]);
        await expect(service.find({ filter: { handle: 'nobody' }, count: 1 })).rejects.toMatchObject({
            name: 'NotFoundError',
        });
    });

    it(`${name}: returns the first document for a single-result lookup`, async () => {
        mockQuery.exec.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
        const result = await service.find({ id: 'a' });
        expect(result).toMatchObject({ id: 'a' });
    });

    it(`${name}: returns [] for a multi-result lookup with no matches rather than throwing`, async () => {
        mockQuery.exec.mockResolvedValueOnce([]);
        const result = await service.find({ filter: { handle: 'nobody' } });
        expect(result).toEqual([]);
    });

    it(`${name}: returns every document for a multi-result lookup`, async () => {
        mockQuery.exec.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
        const result = await service.find({ filter: {} });
        expect(result).toHaveLength(2);
    });

    it(`${name}: delegates create to the model`, async () => {
        const input = { handle: 'x' } as never;
        const result = await service.create(input);
        expect(result).toMatchObject({ id: 'created' });
    });

    it(`${name}: resolves findById through .exec() and returns null when absent`, async () => {
        mockQuery.exec.mockResolvedValueOnce(null);
        const result = await service.findById('missing');
        expect(result).toBeNull();
    });

    it(`${name}: resolves findById to the document when present`, async () => {
        mockQuery.exec.mockResolvedValueOnce({ id: 'found' });
        const result = await service.findById('found');
        expect(result).toMatchObject({ id: 'found' });
    });

    it(`${name}: resolves findOneAndUpdate to null when no document matches`, async () => {
        mockQuery.exec.mockResolvedValueOnce(null);
        const result = await service.findOneAndUpdate({ handle: 'x' }, { handle: 'y' });
        expect(result).toBeNull();
    });

    it(`${name}: resolves findOneAndUpdate to the updated document`, async () => {
        mockQuery.exec.mockResolvedValueOnce({ id: 'updated' });
        const result = await service.findOneAndUpdate({ handle: 'x' }, { handle: 'y' });
        expect(result).toMatchObject({ id: 'updated' });
    });
});
