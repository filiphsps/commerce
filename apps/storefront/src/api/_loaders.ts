import 'server-only';

import { Shop as RawShop } from '@nordcom/commerce-db';
import { cache } from 'react';

import { ArticleApi as _ArticleApi } from './article';
import { BlogApi as _BlogApi } from './shopify/blog';
import { CollectionApi as _CollectionApi } from './shopify/collection';
import { ProductApi as _ProductApi } from './shopify/product';
import { CountriesApi as _CountriesApi, LocaleApi as _LocaleApi, LocalesApi as _LocalesApi } from './store';

export const Shop = {
    findByDomain: cache(RawShop.findByDomain.bind(RawShop)),
    findAll: cache(RawShop.findAll.bind(RawShop)),
};

export const CountriesApi = cache((args: Parameters<typeof _CountriesApi>[0]) => _CountriesApi(args));
export const LocaleApi = cache((args: Parameters<typeof _LocaleApi>[0]) => _LocaleApi(args));
export const LocalesApi = cache((args: Parameters<typeof _LocalesApi>[0]) => _LocalesApi(args));

export const ProductApi = cache((args: Parameters<typeof _ProductApi>[0]) => _ProductApi(args));
export const CollectionApi = cache((args: Parameters<typeof _CollectionApi>[0]) => _CollectionApi(args));
export const BlogApi = cache((args: Parameters<typeof _BlogApi>[0]) => _BlogApi(args));
export const ArticleApi = cache((args: Parameters<typeof _ArticleApi>[0]) => _ArticleApi(args));
