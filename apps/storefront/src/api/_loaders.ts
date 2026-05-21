import 'server-only';

import { Shop as RawShop } from '@nordcom/commerce-db';
import { cache } from 'react';

import { CountriesApi as _CountriesApi, LocaleApi as _LocaleApi, LocalesApi as _LocalesApi } from './store';

export const Shop = {
    findByDomain: cache(RawShop.findByDomain.bind(RawShop)),
    findAll: cache(RawShop.findAll.bind(RawShop)),
};

export const CountriesApi = cache((args: Parameters<typeof _CountriesApi>[0]) => _CountriesApi(args));
export const LocaleApi = cache((args: Parameters<typeof _LocaleApi>[0]) => _LocaleApi(args));
export const LocalesApi = cache((args: Parameters<typeof _LocalesApi>[0]) => _LocalesApi(args));
