import { ShopModel } from '../models';
import { Service } from './service';

import type { ShopBase } from '../models';

export const Shop = new Service<ShopBase, typeof ShopModel>(ShopModel);
