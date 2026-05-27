import { NotFoundError } from '@nordcom/commerce-errors';
import type { Model, ProjectionType, Query, QueryFilter, QueryOptions, UpdateQuery } from 'mongoose';

import type { BaseDocument } from '../db';
import { db } from '../db';

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

/*interface BaseUpdatableQuery<I> {
    update?: {
        input: UpdateQuery<I>;
        createIfNotFound?: boolean;
    };
}*/

interface BaseFilterableQuery<I> {
    filter?: QueryFilter<I>;
    projection?: ProjectionType<I> | undefined;
}

/**
 * Generic Mongoose-backed CRUD base for all document services in this package. Subclasses
 * specialize it with a concrete model type and may override individual methods to add
 * domain-specific validation, projection, or shape conversion.
 */
export class Service<DocType extends BaseDocument, M extends typeof Model<DocType>> {
    private readonly modelName: string;
    /**
     * Returns the Mongoose model instance, looked up by name from the active connection to pick
     * up hot-reloaded or re-registered models in development.
     *
     * @returns The Mongoose model for `DocType`.
     */
    get model(): M {
        return db.models[this.modelName] as M;
    }

    /**
     * Stores the model name rather than the model instance so that hot-reloads during development
     * do not leave this service holding a stale model reference.
     *
     * @param model - The Mongoose model constructor this service operates on; only its
     *   `modelName` is retained.
     */
    public constructor(model: M) {
        this.modelName = model.modelName;
    }

    /**
     * Persists a new document. `BaseDocument` fields (id, timestamps) are excluded from the input
     * type because Mongoose generates them automatically on insert.
     *
     * @param input - Document fields excluding those managed by the base schema (`id`, `createdAt`,
     *   `updatedAt`).
     * @returns The persisted document including the generated `id` and timestamps.
     */
    public async create(input: Omit<DocType, keyof BaseDocument>): Promise<DocType> {
        // `Model.create()` already persists the document; the previous code
        // chained `.then((doc) => doc.save())` which re-saved a clean doc and
        // re-fired every `post('save')` hook. With the Shop -> tenant sync
        // hook attached, that meant every `Shop.create()` ran the tenant
        // upsert twice and stressed both Mongo and Payload for no reason.
        return this.model.create(input);
    }

    private mutateQuery<Q>(req: Query<unknown, DocType>, args: { [k: string]: unknown }): () => Q {
        const { id } = args;

        for (const [key, value] of Object.entries(args)) {
            switch (key) {
                case 'count': {
                    if ((!id && !value) || typeof value !== 'number') break;

                    req.limit(id || (typeof value === 'number' && value <= 1) ? 1 : value);
                    break;
                }

                case 'sort': {
                    if (!id || !value) break;

                    req = req.sort(value as BaseQuery['sort']);
                    break;
                }
            }
        }

        return () => req as Q;
    }

    /**
     * Executes a Mongoose query with optional pagination and field projection. Passing `id` or
     * `count: 1` activates the single-document overload; any other combination returns an array.
     *
     * @param args.id - When set, queries by `_id` and returns one document.
     * @param args.count - Limits the number of returned documents; `1` activates the
     *   single-document overload.
     * @param args.filter - Mongoose query filter applied before the limit.
     * @param args.projection - Fields to include or exclude from returned documents.
     * @returns A single `DocType` when `id` or `count: 1`; otherwise `DocType[]`.
     * @throws {NotFoundError} When `id` or `count: 1` is set and no matching document exists.
     */
    public async find(args: MergeTypes<[BaseQuery, BaseFilterableQuery<DocType>, ReturnsOneQuery]>): Promise<DocType>;
    public async find(args: MergeTypes<[BaseQuery, BaseFilterableQuery<DocType>]>): Promise<DocType[]>;
    public async find(args: MergeTypes<[BaseQuery, BaseFilterableQuery<DocType>]>): Promise<DocType | DocType[]> {
        const { id, count, filter = {}, projection = undefined } = { id: undefined, count: undefined, ...args };

        // Mongoose's strict `RootFilterQuery<DocType>` rejects our literal at
        // admin's stricter tsconfig (the structural shape is identical, but
        // the overload picker treats the spread as a different union member).
        // Cast the method through `unknown` to a permissive signature — same
        // pattern `findOneAndUpdate` uses below to untangle the same overload
        // selection problem.
        let req = (this.model.find as unknown as (filter: unknown, projection?: unknown) => Query<DocType[], DocType>)(
            {
                ...filter,
                ...(id ? { _id: id } : {}),
            },
            projection,
        );
        req = this.mutateQuery<typeof req>(req, args)();

        const res = await req.exec();
        const isSingleResult = !!id || count === 1;
        if ((res || []).length <= 0) {
            // The single-result overload (`id` or `count: 1`) promises
            // `Promise<DocType>`. Returning `[]` here was a type lie that
            // crashed every caller doing `(await find(...)).toObject()` — the
            // auth adapter and `Shop.findByDomain`. Throw `NotFoundError` so
            // the adapter's existing `CommerceError.isNotFound` branch maps
            // it to the documented `null` contract and the storefront
            // middleware routes unknown shops to `/status/unknown-shop/`.
            if (isSingleResult) {
                throw new NotFoundError(this.modelName);
            }
            return [];
        }

        if (isSingleResult) {
            return res[0] as DocType;
        }
        return res as DocType[];
    }

    /**
     * Finds a document by its MongoDB `_id`, returning `null` when absent rather than throwing.
     *
     * @param id - MongoDB `_id` string.
     * @param projection - Fields to include or exclude from the returned document.
     * @param options - Mongoose query options (e.g. `lean`, `session`).
     * @returns The matching document, or `null` when no document with that `_id` exists.
     */
    public async findById(
        id: string,
        projection?: ProjectionType<DocType> | null,
        options?: QueryOptions<DocType> | null,
    ): Promise<DocType | null> {
        // Mongoose Query objects are thenable, so the old `return res;` form
        // worked at runtime — but the return type from `Model.findById` is
        // `Query<...>`, not `Promise<...>`. Without an explicit `.exec()`
        // call, TypeScript silently widens the return type to `any` for
        // callers and we lose the `DocType | null` contract that the
        // signature promises.
        const res = await this.model.findById(id, projection, options).exec();
        return res ?? null;
    }

    /**
     * Atomically finds and updates one document matching the filter.
     *
     * @param filter - Mongoose query filter that selects the target document.
     * @param update - Update expression applied to the matched document.
     * @param options - Mongoose update options; defaults to `{ lean: true }`.
     * @returns The updated document, or `null` when no document matched the filter.
     */
    public async findOneAndUpdate(
        filter: QueryFilter<DocType>,
        update?: UpdateQuery<DocType>,
        options: QueryOptions<DocType> = { lean: true },
    ): Promise<DocType | null> {
        // Mongoose's overload resolution treats our `QueryFilter` as something
        // that could be passed *as a query* rather than as a filter, so the
        // strict types reject it. Cast through `unknown` — the runtime shape
        // matches; this is just untangling the overload picker.
        const res = await (
            this.model.findOneAndUpdate as unknown as (
                filter: unknown,
                update?: unknown,
                options?: unknown,
            ) => { exec(): Promise<DocType | null> }
        )(filter, update, options).exec();
        return res ?? null;
    }
}
