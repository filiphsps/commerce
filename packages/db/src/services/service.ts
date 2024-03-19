import { TodoError } from '@nordcom/commerce-errors';
import { FilterQuery, Model, ProjectionType, QueryOptions, UpdateQuery } from 'mongoose';
import { db, type BaseDocument } from '../db';

export class Service<I extends BaseDocument, M extends typeof Model<I>> {
    private readonly modelName: string;
    get model(): M {
        return db.models[this.modelName] as M;
    }

    public constructor(model: M) {
        this.modelName = model.modelName;
    }

    public async create(input: Omit<I, keyof BaseDocument>): Promise<I> {
        return this.model.create(input).then((doc) => doc.save());
    }

    public async get(filter?: FilterQuery<I>): Promise<I | I[]> {
        const res = await this.model.find(filter || {}).orFail();

        if (res.length < 1) throw new TodoError('No data found');
        else if (res.length === 1) return res[0];
        return res;
    }

    public async findById(
        id: string,
        projection?: ProjectionType<I> | null,
        options?: QueryOptions<I> | null
    ): Promise<I> {
        return this.model.findById(id, projection, options).orFail();
    }
    public async findOne(
        filter: FilterQuery<I>,
        projection?: ProjectionType<I> | null,
        options: QueryOptions<I> = { lean: true }
    ): Promise<I> {
        return this.model.findOne(filter, projection, options).orFail();
    }

    public async findOneAndUpdate(
        filter: FilterQuery<I>,
        update?: UpdateQuery<I>,
        options: QueryOptions<I> = { includeResultMetadata: true, lean: true }
    ): Promise<I> {
        return this.model.findOneAndUpdate(filter, update, options).orFail();
    }
}
