import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { AuthStrategy, SanitizedConfig } from 'payload';
import { buildConfig } from 'payload';
import { allCollections, buildUsers } from '../collections';
import { buildMultiTenantPlugin, storagePluginFromEnv } from '../plugins';

export type BuildPayloadConfigOptions = {
    secret: string;
    mongoUrl: string;
    serverUrl?: string;
    /** When true, mount the admin UI at routes.admin (default '/cms'). Storefront passes false. */
    includeAdmin?: boolean;
    /** When false, skip the S3 storage plugin even if env vars are set. Default true. */
    enableStorage?: boolean;
    /** Hard-coded supported locales for this deployment. */
    locales?: string[];
    /** Fallback default locale. Defaults to 'en-US'. */
    defaultLocale?: string;
    /** Custom Payload auth strategies (e.g. NextAuth bridge). */
    authStrategies?: AuthStrategy[];
    /** Disable password-based login in favour of the provided strategies. */
    disablePasswordLogin?: boolean;
};

const DEFAULT_LOCALES = ['en-US', 'sv', 'de', 'es', 'fr', 'no'];

export const buildPayloadConfig = async ({
    secret,
    mongoUrl,
    serverUrl,
    includeAdmin = true,
    enableStorage = true,
    locales = DEFAULT_LOCALES,
    defaultLocale = 'en-US',
    authStrategies,
    disablePasswordLogin,
}: BuildPayloadConfigOptions): Promise<SanitizedConfig> => {
    const plugins = [buildMultiTenantPlugin()];
    if (enableStorage) {
        const storage = storagePluginFromEnv();
        if (storage) plugins.push(storage);
    }

    const collections = allCollections.map((c) =>
        c.slug === 'users' ? buildUsers({ authStrategies, disablePasswordLogin }) : c,
    );

    return buildConfig({
        secret,
        serverURL: serverUrl,
        db: mongooseAdapter({ url: mongoUrl }),
        editor: lexicalEditor({}),
        collections,
        localization: { locales, defaultLocale, fallback: true },
        plugins,
        ...(includeAdmin ? { admin: { user: 'users', meta: { titleSuffix: ' — Nordcom CMS' } } } : {}),
        routes: { admin: '/cms' },
    });
};
