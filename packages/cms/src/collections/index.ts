import { businessData, footer, header } from './_globals';
import { articles } from './articles';
import { collectionMetadata } from './collection-metadata';
import { featureFlags } from './feature-flags';
import { media } from './media';
import { pages } from './pages';
import { productMetadata } from './product-metadata';
import { reviews } from './reviews';
import { shops } from './shops';
import { tenants } from './tenants';
import { users } from './users';

export { businessData, footer, header } from './_globals';
export { articles } from './articles';
export { type BuildUsersOptions, buildUsers } from './build-users';
export { collectionMetadata } from './collection-metadata';
export { featureFlags } from './feature-flags';
export { media } from './media';
export { pages } from './pages';
export { productMetadata } from './product-metadata';
export { reviews } from './reviews';
export { shops } from './shops';
export { tenants } from './tenants';
export { users } from './users';

export const allCollections = [
    tenants,
    users,
    media,
    shops,
    featureFlags,
    pages,
    articles,
    productMetadata,
    collectionMetadata,
    reviews,
    header,
    footer,
    businessData,
];

export const globalLikeCollections = ['header', 'footer', 'businessData'] as const;
export const tenantScopedCollections = [
    'pages',
    'articles',
    'productMetadata',
    'collectionMetadata',
    'header',
    'footer',
    'businessData',
    'media',
    'reviews',
] as const;
