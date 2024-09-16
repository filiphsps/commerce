import { TodoError } from '@nordcom/commerce-errors';

import { db } from '../db';

import type { BaseDocument } from '../db';
import type { FilterQuery, Model, ProjectionType, Query, QueryOptions, UpdateQuery } from 'mongoose';

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type MergeTypes<T extends any[]> =
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
    filter?: FilterQuery<I>;
    projection?: ProjectionType<I> | undefined;
}

export class Service<DocType extends BaseDocument, M extends typeof Model<DocType>> {
    private readonly modelName: string;
    get model(): M {
        return db.models[this.modelName] as M;
    }

    public constructor(model: M) {
        this.modelName = model.modelName;
    }

    public async create(input: Omit<DocType, keyof BaseDocument>): Promise<DocType> {
        return this.model.create(input).then((doc) => doc.save());
    }

    private mutateQuery<Q>(req: Query<any, DocType>, args: { [k: string]: any }): Promise<() => Q> {
        return new Promise(async (resolve) => {
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

                        req = req.sort(value);
                        break;
                    }
                }
            }

            return resolve(() => req as Q);
        });
    }

    public async find(args: MergeTypes<[BaseQuery, BaseFilterableQuery<DocType>, ReturnsOneQuery]>): Promise<DocType>;
    public async find(args: MergeTypes<[BaseQuery, BaseFilterableQuery<DocType>]>): Promise<DocType[]>;
    public async find(args: MergeTypes<[BaseQuery, BaseFilterableQuery<DocType>]>): Promise<DocType | DocType[]> {
        type Model = typeof this.model.find<DocType>;
        type Req = ReturnType<Model>;

        const { id, count, filter = {}, projection = undefined } = { id: undefined, count: undefined, ...args };

        let req = this.model.find<DocType>(
            {
                ...filter,
                ...((id as any) ? { _id: id } : {})
            },
            projection
        );
        req = (await this.mutateQuery<Req>(req, args))();

        let res = await req.exec();
        if (((res as any) || []).length <= 0) {
            throw new TodoError('No data found');
        }

        if ((id as any) || (count && count === 1)) {
            return res[0] as DocType;
        }
        return res as DocType[];
    }

    public async findById(
        id: string,
        projection?: ProjectionType<DocType> | null,
        options?: QueryOptions<DocType> | null
    ): Promise<DocType> {
        const res = this.model.findById(id, projection, options);
        if (!(res as any)) {
            throw new TodoError('No data found');
        }

        return res;
    }

    public async findOneAndUpdate(
        filter: FilterQuery<DocType>,
        update?: UpdateQuery<DocType>,
        options: QueryOptions<DocType> = { includeResultMetadata: true, lean: true }
    ): Promise<DocType> {
        const res = this.model.findOneAndUpdate(filter, update, options);
        if (!(res as any)) {
            throw new TodoError('No data found');
        }

        return res;
    }
}
