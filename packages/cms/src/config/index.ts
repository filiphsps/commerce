import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig, type SanitizedConfig } from 'payload';
import { allCollections } from '../collections';
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
}: BuildPayloadConfigOptions): Promise<SanitizedConfig> => {
    const plugins = [buildMultiTenantPlugin()];
    if (enableStorage) {
        const storage = storagePluginFromEnv();
        if (storage) plugins.push(storage);
    }

    return buildConfig({
        secret,
        serverURL: serverUrl,
        db: mongooseAdapter({ url: mongoUrl }),
        editor: lexicalEditor({}),
        collections: allCollections,
        localization: { locales, defaultLocale, fallback: true },
        plugins,
        ...(includeAdmin ? { admin: { user: 'users', meta: { titleSuffix: ' — Nordcom CMS' } } } : {}),
        routes: { admin: '/cms' },
    });
};
