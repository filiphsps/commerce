import { NotFoundError } from '@nordcom/commerce-errors';
// Type-only Mongoose imports: the SFREAD-02 service-seam contract snapshot pins every public
// signature to these query types, so they stay the seam's public argument vocabulary even though
// the implementation is Convex-backed. Mongoose is a TYPE dependency only — no runtime mongoose
// (no connect, no models) exists anywhere in this package.
import type { ProjectionType, Query, QueryFilter, QueryOptions, UpdateQuery } from 'mongoose';

import type { BaseDocument } from '../db';

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type MergeTypes<T extends unknown[]> =
    UnionToIntersection<T[number]> extends infer A ? { [key in keyof A]: A[key] } : never;

interface BaseQuery {
    count?: number;
    sort?: Parameters<Query<unknown, unknown>['sort']>[0];
}

interface ReturnsOneQuery {
    count?: 1;
    id?: string;
}

interface BaseFilterableQuery<I> {
    filter?: QueryFilter<I>;
    projection?: ProjectionType<I> | undefined;
}

/**
 * Normalized read arguments a {@link ServiceBackend} receives from `Service.find`: the single-doc
 * discriminators (`id`, `count`) plus the passthrough filter/projection/sort vocabulary.
 */
export interface BackendFindArgs<DocType> {
    id?: string;
    count?: number;
    filter?: QueryFilter<DocType>;
    projection?: ProjectionType<DocType> | undefined;
    sort?: BaseQuery['sort'];
}

/**
 * The per-entity Convex adapter a {@link Service} delegates to. Each backend translates the frozen
 * Mongoose-shaped seam vocabulary (filters like `{ email }` or `{ identities: { $elemMatch } }`,
 * updates like `{ $push }`) into calls against the deployed `db/*` Convex functions. Backends throw
 * `TodoError` for filter/update shapes no caller uses, so an unsupported translation fails loudly
 * instead of silently returning wrong rows.
 */
export interface ServiceBackend<DocType extends BaseDocument> {
    /** Entity name used for `NotFoundError`s, mirroring the old Mongoose `modelName`. */
    readonly name: string;
    /** Persists a new document and resolves the stored row (id + timestamps included). */
    create(input: Omit<DocType, keyof BaseDocument>): Promise<DocType>;
    /** Resolves every document matching the normalized args; empty array on no match. */
    findMany(args: BackendFindArgs<DocType>): Promise<DocType[]>;
    /** Resolves a document by its public id, or `null` when absent. */
    findById(
        id: string,
        projection?: ProjectionType<DocType>,
        options?: QueryOptions<DocType>,
    ): Promise<DocType | null>;
    /** Atomically updates (or upserts) one document matching the filter; `null` when none matched. */
    findOneAndUpdate(
        filter: QueryFilter<DocType>,
        update?: UpdateQuery<DocType>,
        options?: QueryOptions<DocType>,
    ): Promise<DocType | null>;
}

/**
 * Generic Convex-backed CRUD base for all document services in this package. The public surface —
 * signatures, the `NotFoundError`-on-empty single-result contract, the `[]` multi-result fallback —
 * is frozen by the SFREAD-02 seam snapshot; only the persistence underneath moved from Mongoose to
 * the deployed `db/*` Convex functions, reached through the per-entity {@link ServiceBackend}.
 */
export class Service<DocType extends BaseDocument> {
    private readonly backend: ServiceBackend<DocType>;

    /**
     * Binds the service to its per-entity Convex backend.
     *
     * @param backend - The adapter translating seam calls into deployed Convex function calls.
     */
    public constructor(backend: ServiceBackend<DocType>) {
        this.backend = backend;
    }

    /**
     * Persists a new document. `BaseDocument` fields (id, timestamps) are excluded from the input
     * type because the backend generates them on insert.
     *
     * @param input - Document fields excluding those managed by the base shape (`id`, `createdAt`,
     *   `updatedAt`).
     * @returns The persisted document including the generated `id` and timestamps.
     */
    public async create(input: Omit<DocType, keyof BaseDocument>): Promise<DocType> {
        return this.backend.create(input);
    }

    /**
     * Executes a seam query with optional pagination and field projection. Passing `id` or
     * `count: 1` activates the single-document overload; any other combination returns an array.
     *
     * @param args.id - When set, queries by the public id and returns one document.
     * @param args.count - Limits the number of returned documents; `1` activates the
     *   single-document overload.
     * @param args.filter - Seam query filter (the frozen Mongoose-shaped vocabulary) translated by
     *   the backend.
     * @param args.projection - Fields to include in returned documents.
     * @returns A single `DocType` when `id` or `count: 1`; otherwise `DocType[]`.
     * @throws {NotFoundError} When `id` or `count: 1` is set and no matching document exists.
     */
    public async find(args: MergeTypes<[BaseQuery, BaseFilterableQuery<DocType>, ReturnsOneQuery]>): Promise<DocType>;
    public async find(args: MergeTypes<[BaseQuery, BaseFilterableQuery<DocType>]>): Promise<DocType[]>;
    public async find(args: MergeTypes<[BaseQuery, BaseFilterableQuery<DocType>]>): Promise<DocType | DocType[]> {
        const { id, count, filter = {}, projection = undefined } = { id: undefined, count: undefined, ...args };

        const res = await this.backend.findMany({ id, count, filter, projection, sort: args.sort });

        const isSingleResult = !!id || count === 1;
        if ((res || []).length <= 0) {
            // The single-result overload (`id` or `count: 1`) promises `Promise<DocType>`.
            // Returning `[]` here was a type lie that crashed every caller awaiting one document —
            // the auth adapter and `Shop.findByDomain`. Throw `NotFoundError` so the adapter's
            // existing `CommerceError.isNotFound` branch maps it to the documented `null` contract
            // and the storefront middleware routes unknown shops to `/status/unknown-shop/`.
            if (isSingleResult) {
                throw new NotFoundError(this.backend.name);
            }
            return [];
        }

        if (isSingleResult) {
            return res[0] as DocType;
        }
        return res;
    }

    /**
     * Finds a document by its public id, returning `null` when absent rather than throwing.
     *
     * @param id - Public id string.
     * @param projection - Fields to include in the returned document.
     * @param options - Query options; retained for the frozen signature. The Convex backend returns
     *   plain rows unconditionally, so lean/session options have no effect.
     * @returns The matching document, or `null` when no document with that id exists.
     */
    public async findById(
        id: string,
        projection?: ProjectionType<DocType> | null,
        options?: QueryOptions<DocType> | null,
    ): Promise<DocType | null> {
        const res = await this.backend.findById(id, projection ?? undefined, options ?? undefined);
        return res ?? null;
    }

    /**
     * Atomically finds and updates one document matching the filter.
     *
     * @param filter - Seam query filter that selects the target document.
     * @param update - Update expression applied to the matched document.
     * @param options - Update options; defaults to `{ lean: true }` (the frozen default — inert on
     *   the Convex backend, which always returns plain rows). `upsert: true` is honored.
     * @returns The updated document, or `null` when no document matched the filter.
     */
    public async findOneAndUpdate(
        filter: QueryFilter<DocType>,
        update?: UpdateQuery<DocType>,
        options: QueryOptions<DocType> = { lean: true },
    ): Promise<DocType | null> {
        const res = await this.backend.findOneAndUpdate(filter, update, options);
        return res ?? null;
    }
}
