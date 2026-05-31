import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { SanitizedConfig } from 'payload';
import { buildConfig } from 'payload';

import { articles } from '../collections/articles';
import { collectionMetadata } from '../collections/collection-metadata';
import { media } from '../collections/media';
import { pages } from '../collections/pages';
import { productMetadata } from '../collections/product-metadata';
import { shops } from '../collections/shops';
import { users } from '../collections/users';

/**
 * Options for {@link buildTestConfig}.
 *
 * @example
 * buildTestConfig({ suite: 'pages', locales: ['en-US', 'sv-SE'], defaultLocale: 'en-US' });
 */
export type BuildTestConfigOptions = {
    suite: string;
    locales?: string[];
    defaultLocale?: string;
};

/**
 * Build a Payload config for tests. Includes the full set of CMS collections so
 * link/relationship fields resolve cleanly. Uses a suite-suffixed local DB.
 *
 * @param options - {@link BuildTestConfigOptions} specifying the test suite name and optional locale settings.
 * @returns A fully initialized Payload `SanitizedConfig` ready to pass to `getPayload`.
 * @example
 * ```ts
 * const config = await buildTestConfig({ suite: 'pages', locales: ['en-US', 'sv-SE'], defaultLocale: 'en-US' });
 * const payload = await getPayload({ config });
 * ```
 */
export const buildTestConfig = async ({
    suite,
    locales = ['en-US'],
    defaultLocale = 'en-US',
}: BuildTestConfigOptions): Promise<SanitizedConfig> => {
    const baseUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/test';
    const url = new URL(baseUri);
    url.pathname = `/test_${suite}_${Date.now()}`;

    return buildConfig({
        secret: 'test',
        db: mongooseAdapter({ url: url.toString() }),
        editor: lexicalEditor({}),
        collections: [shops, users, media, pages, articles, productMetadata, collectionMetadata],
        localization: { locales, defaultLocale, fallback: true },
        plugins: [
            multiTenantPlugin({
                tenantsSlug: 'shops',
                userHasAccessToAllTenants: (user: unknown) => (user as { role?: string } | null)?.role === 'admin',
                collections: {
                    pages: {},
                    articles: {},
                    productMetadata: {},
                    collectionMetadata: {},
                    media: {},
                },
            }),
        ],
    });
};
