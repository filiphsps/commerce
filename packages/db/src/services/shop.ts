import { ShopModel } from '../models';
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
        return this.find({
            ...args,
            filter: {
                ...args.filter,
                collaborators: collaboratorId
            }
        });
    }
}

export const Shop = new ShopService();
