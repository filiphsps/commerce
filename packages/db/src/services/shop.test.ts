import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShopService } from './shop';

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
        ...((await vi.importActual('mongoose')) || {}),
        Model: MockModel,
        Document: {},
        ...values,
        connect: vi.fn().mockResolvedValue(values),
        default: {
            ...values
        }
    };
});

describe('services', () => {
    describe('shop', () => {
        let shopService: ShopService;

        beforeEach(() => {
            shopService = new ShopService();
        });

        it('should find shops by collaborator', async () => {
            const collaboratorId = '123';
            const filter = { name: 'Shop 1' };
            const findSpy = vi.spyOn(shopService, 'find');

            await shopService.findByCollaborator({ collaboratorId, filter });

            expect(findSpy).toHaveBeenCalledWith({
                filter: {
                    ...filter,
                    collaborators: collaboratorId
                }
            });
        });
    });
});
