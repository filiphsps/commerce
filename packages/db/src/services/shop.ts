import { ShopModel } from '../models';

import { User } from '.';
import { Service } from './service';

import type { OnlineShop, ShopBase } from '../models';

type FindOptions = {
    /** Whether to convert the result to a normal object or keep it as a mongoose document. */
    convert?: boolean;
    sensitiveData?: boolean;
};

export class ShopService extends Service<ShopBase, typeof ShopModel> {
    public constructor() {
        super(ShopModel);
    }

    public async findByCollaborator({
        collaboratorId,
        ...args
    }: { collaboratorId: string } & Parameters<typeof this.find>[0]) {
        const collaborator = await User.find({ id: collaboratorId });

        return await this.find({
            ...args,
            filter: {
                ...args.filter,
                collaborators: {
                    $elemMatch: {
                        user: collaborator
                    }
                }
            }
        });
    }

    public async findByDomain(domain: string, options?: FindOptions): Promise<OnlineShop | ShopBase>;
    public async findByDomain(
        domain: string,
        { sensitiveData = false, convert = true }: FindOptions = {}
    ): Promise<OnlineShop | ShopBase> {
        const shop = await this.find({
            count: 1,
            filter: {
                $or: [
                    { domain },
                    {
                        alternativeDomains: domain
                    }
                ]
            },
            projection: {
                ...(!sensitiveData && {
                    collaborators: 0
                })
            }
        });

        if (!convert) {
            return shop;
        }

        const res = shop.toObject<OnlineShop>({
            getters: true,
            virtuals: true,
            versionKey: false,
            flattenMaps: true,
            flattenObjectIds: true,
            useProjection: true,
            depopulate: true
        });

        return res;
    }

    public async findAll({ ...args }: Parameters<typeof this.find>[0] | undefined = {}) {
        return await this.find({
            ...args,
            filter: {},
            projection: {
                collaborators: 0,
                contentProvider: 0,
                commerceProvider: 0,
                thirdParty: 0
            }
        });
    }
}

export const Shop = new ShopService();
