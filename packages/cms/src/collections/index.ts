import { businessData, footer, header } from './_globals';
import { articles } from './articles';
import { collectionMetadata } from './collection-metadata';
import { media } from './media';
import { pages } from './pages';
import { productMetadata } from './product-metadata';
import { tenants } from './tenants';
import { users } from './users';

export { businessData, footer, header } from './_globals';
export { articles } from './articles';
export { type BuildUsersOptions, buildUsers } from './build-users';
export { collectionMetadata } from './collection-metadata';
export { media } from './media';
export { pages } from './pages';
export { productMetadata } from './product-metadata';
export { tenants } from './tenants';
export { users } from './users';

export const allCollections = [
    tenants,
    users,
    media,
    pages,
    articles,
    productMetadata,
    collectionMetadata,
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
] as const;
