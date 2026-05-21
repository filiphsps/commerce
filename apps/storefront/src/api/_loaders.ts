import 'server-only';

import { Shop as RawShop } from '@nordcom/commerce-db';
import { cache } from 'react';

export const Shop = {
    findByDomain: cache(RawShop.findByDomain.bind(RawShop)),
    findAll: cache(RawShop.findAll.bind(RawShop)),
};
