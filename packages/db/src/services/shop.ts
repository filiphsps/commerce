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

        if (!sensitiveData) {
            delete (res as any)._id;

            let commerceProvider = {};
            switch (res.commerceProvider.type) {
                case 'shopify': {
                    commerceProvider = {
                        ...res.commerceProvider,
                        authentication: {
                            domain: res.commerceProvider.authentication.domain,
                            publicToken: res.commerceProvider.authentication.publicToken
                        }
                    };
                    break;
                }
                case 'stripe': {
                    commerceProvider = {
                        ...res.commerceProvider,
                        authentication: {}
                    };
                    break;
                }
            }

            let contentProvider = {};
            switch (res.contentProvider.type) {
                case 'prismic': {
                    contentProvider = {
                        ...res.contentProvider,
                        authentication: {}
                    };
                    break;
                }
                case 'builder.io': {
                    contentProvider = {
                        ...res.contentProvider,
                        authentication: {
                            publicToken: res.contentProvider.authentication.publicToken
                        }
                    };
                }
            }

            return {
                ...res,
                commerceProvider,
                contentProvider
            } as any;
        }

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
