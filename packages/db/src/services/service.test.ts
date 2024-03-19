import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Model } from 'mongoose';
import { Service } from './service';

import type { BaseDocument } from '../db';

// Mocking the Model class
vi.mock('mongoose', async () => {
    const mockDocument = {
        _id: '123',
        name: 'John Doe',
        age: 30,
        save: vi.fn().mockResolvedValue(this)
    };

    const mockDocuments = [
        mockDocument,
        {
            _id: '456',
            name: 'Jane Doe',
            age: 25,
            save: vi.fn().mockResolvedValue(this)
        }
    ];

    class MockModel {
        public static modelName = 'MockModel';
        public static find = vi.fn().mockReturnThis();
        public static sort = vi.fn().mockReturnThis();
        public static limit = vi.fn().mockReturnThis();
        public static exec = vi.fn().mockResolvedValue(mockDocuments);
        public static create = vi.fn().mockResolvedValue(mockDocument);
        public static findById = vi.fn().mockResolvedValue(mockDocument);
        public static findOneAndUpdate = vi.fn().mockResolvedValue(mockDocument);
        public static orFail = vi.fn().mockReturnThis();
        public limit = vi.fn().mockResolvedValue(this);
        public save = vi.fn().mockResolvedValue(this);
    }

    const values = {
        connect: vi.fn().mockResolvedValue({
            get models() {
                return new Proxy([], {
                    get: () => MockModel
                });
            }
        }),
        set: vi.fn()
    };

    return {
        Model: MockModel,
        Document: {},
        ...values,
        connect: vi.fn().mockResolvedValue(values),
        default: {
            ...values
        }
    };
});

describe('Service', () => {
    let model: any;
    let service: Service<BaseDocument, typeof Model>;

    beforeEach(() => {
        model = new Model();
        service = new Service(model);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('should create a document', async () => {
            const input = { name: 'John Doe' };
            await service.create(input);
            expect(Model.create).toHaveBeenCalledWith(input);
            //expect(model.save).toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        it('should find one document', async () => {
            const filter = { name: 'John Doe' };
            await service.findOne(filter);
            expect(Model.find).toHaveBeenCalledWith(filter);
        });
    });

    describe('find', () => {
        it('should find multiple documents', async () => {
            const filter = { name: 'John Doe' };
            const result = await service.find({ filter });
            expect(Model.find).toHaveBeenCalledWith(expect.objectContaining(filter));
            expect((result as any).length).toEqual(2);
        });

        it('should find one document', async () => {
            const filter = { name: 'John Doe' };
            const result = await service.find({ filter, count: 1 });
            expect(Model.find).toHaveBeenCalledWith(filter);
            //expect(model.limit).toHaveBeenCalledWith(1);
            expect(result._id).toEqual('123');
        });
    });

    describe('get', () => {
        it.skip('should get one document', async () => {
            const filter = { name: 'John Doe' };
            const result = await service.get(filter);
            expect(Model.find).toHaveBeenCalledWith(filter);
            expect(result).toEqual(expect.arrayContaining([{ _id: '123' }, { _id: '456' }]));
        });

        it.skip('should get multiple documents', async () => {
            const filter = { name: 'John Doe' };
            const result = await service.get(filter);
            expect(Model.find).toHaveBeenCalledWith(filter);
            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('should find a document by id', async () => {
            const id = '123';
            const projection = { name: 1 };
            const options = { lean: true };
            await service.findById(id, projection, options);
            expect(Model.findById).toHaveBeenCalledWith(id, projection, options);
        });
    });

    describe('findOneAndUpdate', () => {
        it('should find and update a document', async () => {
            const filter = { name: 'John Doe' };
            const update = { age: 30 };
            const options = { includeResultMetadata: true, lean: true };
            await service.findOneAndUpdate(filter, update, options);
            expect(Model.findOneAndUpdate).toHaveBeenCalledWith(filter, update, options);
        });
    });
});
