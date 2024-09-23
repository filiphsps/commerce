import { ReviewModel } from '../models';

import { Service } from './service';
import { Shop } from './shop';

import type { ReviewBase } from '../models';

type FindOptions = {
    count?: number;
};

export class ReviewService extends Service<ReviewBase, typeof ReviewModel> {
    public constructor() {
        super(ReviewModel);
    }

    public async findByShop(shopId: string, options?: FindOptions): Promise<ReviewBase[]>;
    public async findByShop(shopId: string, { count }: FindOptions = {}): Promise<ReviewBase[]> {
        const shop = await Shop.findById(shopId);

        return await this.find({
            count,
            filter: {
                shop
            }
        });
    }

    public async findAll({ ...args }: Parameters<typeof this.find>[0] | undefined = {}) {
        return await this.find({
            ...args,
            filter: {
                ...args.filter
            }
        });
    }
}

export const Review = new ReviewService();
