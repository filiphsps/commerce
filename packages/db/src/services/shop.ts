import { ShopModel } from '../models';

import { User } from '.';
import { Service } from './service';

import type { ShopBase } from '../models';

export class ShopService extends Service<ShopBase, typeof ShopModel> {
    public constructor() {
        super(ShopModel);
    }

    public async findByCollaborator({
        collaboratorId,
        ...args
    }: { collaboratorId: string } & Parameters<typeof this.find>[0]) {
        const collaborator = await User.find({ id: collaboratorId });

        return this.find({
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

    public async findByDomain(domain: string) {
        return this.find({
            filter: {
                domain
            },
            count: 1
        });
    }
}

export const Shop = new ShopService();
