import { ShopModel } from '../models';
import { Service } from './service';

import type { ShopBase } from '../models';

class ShopService extends Service<ShopBase, typeof ShopModel> {
    constructor() {
        super(ShopModel);
    }
}

export const Shop = new ShopService();
