import 'server-only';

import { Shop as RawShop } from '@nordcom/commerce-db';
import { cache } from 'react';

import { ArticleApi as _ArticleApi } from './article';
import { FooterApi as _FooterApi } from './footer';
import { HeaderApi as _HeaderApi } from './header';
import { InfoBarApi as _InfoBarApi } from './info-bar';
import { CollectionMetadataApi as _CollectionMetadataApi, ProductMetadataApi as _ProductMetadataApi } from './metadata';
import { PagesApi as _PagesApi } from './page';
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

export const HeaderApi = cache((args: Parameters<typeof _HeaderApi>[0]) => _HeaderApi(args));
export const FooterApi = cache((args: Parameters<typeof _FooterApi>[0]) => _FooterApi(args));
export const InfoBarApi = cache((args: Parameters<typeof _InfoBarApi>[0]) => _InfoBarApi(args));
export const ProductMetadataApi = cache((args: Parameters<typeof _ProductMetadataApi>[0]) => _ProductMetadataApi(args));
export const CollectionMetadataApi = cache((args: Parameters<typeof _CollectionMetadataApi>[0]) =>
    _CollectionMetadataApi(args),
);
export const PagesApi = cache((args: Parameters<typeof _PagesApi>[0]) => _PagesApi(args));
