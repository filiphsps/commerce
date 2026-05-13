import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { AuthStrategy, SanitizedConfig } from 'payload';
import { buildConfig } from 'payload';
import { allCollections, buildUsers } from '../collections';
import { buildMultiTenantPlugin, storagePluginFromEnv } from '../plugins';

export type BuildLivePreviewUrlArgs = {
    tenantId: string;
    collection: string;
    data: { slug?: string; shopifyHandle?: string };
    locale: string;
};

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
    /**
     * Absolute path Payload uses as the base for resolving component paths in
     * the importMap. Without this, the CLI / runtime fall back to the
     * package's own folder (inside node_modules in production) and the
     * "import map not found" troubleshooting note in the Payload docs
     * applies: components are looked up at the wrong base and never resolve.
     * Pass the consuming Next.js app's `src/` directory.
     */
    importMapBaseDir?: string;
    /** Absolute path to the generated importMap file (matches what `next/views` imports). */
    importMapFile?: string;
    /** Optional live-preview URL builder for the admin iframe. */
    livePreview?: {
        url: (args: BuildLivePreviewUrlArgs) => string;
        breakpoints?: Array<{ label: string; name: string; width: number; height: number }>;
    };
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
    importMapBaseDir,
    importMapFile,
    livePreview,
}: BuildPayloadConfigOptions): Promise<SanitizedConfig> => {
    const plugins = [buildMultiTenantPlugin()];
    if (enableStorage) {
        const storage = storagePluginFromEnv();
        if (storage) plugins.push(storage);
    }

    const collections = allCollections.map((c) =>
        c.slug === 'users' ? buildUsers({ authStrategies, disablePasswordLogin }) : c,
    );

    const adminConfig = includeAdmin
        ? {
              admin: {
                  user: 'users',
                  meta: { titleSuffix: ' — Nordcom CMS' },
                  // `importMap.baseDir` tells Payload where component paths are
                  // resolved relative to. Without it the runtime falls back to
                  // the @nordcom/commerce-cms package's own folder inside
                  // node_modules, which is wrong for every component reference
                  // the host app makes — manifesting in prod as blank pages on
                  // Create / Edit views where Payload silently fails to load
                  // the field/cell components from the importMap.
                  ...(importMapBaseDir || importMapFile
                      ? {
                            importMap: {
                                ...(importMapBaseDir ? { baseDir: importMapBaseDir } : {}),
                                ...(importMapFile ? { importMapFile } : {}),
                            },
                        }
                      : {}),
                  ...(livePreview
                      ? {
                            livePreview: {
                                breakpoints: livePreview.breakpoints ?? [
                                    { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
                                    { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
                                    { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
                                ],
                                url: ((args: {
                                    data?: Record<string, unknown>;
                                    collectionConfig?: { slug?: string };
                                    locale?: { code?: string };
                                }) => {
                                    const d = (args.data ?? {}) as {
                                        tenant?: string | { id?: string };
                                        slug?: string;
                                        shopifyHandle?: string;
                                    };
                                    const tenantId = typeof d.tenant === 'string' ? d.tenant : (d.tenant?.id ?? '');
                                    return livePreview.url({
                                        tenantId: String(tenantId),
                                        collection: args.collectionConfig?.slug ?? '',
                                        data: { slug: d.slug, shopifyHandle: d.shopifyHandle },
                                        locale: args.locale?.code ?? 'en-US',
                                    });
                                }) as never,
                            },
                        }
                      : {}),
              },
          }
        : {};

    return buildConfig({
        secret,
        serverURL: serverUrl,
        db: mongooseAdapter({ url: mongoUrl }),
        editor: lexicalEditor({}),
        collections,
        localization: { locales, defaultLocale, fallback: true },
        plugins,
        ...adminConfig,
        routes: { admin: '/cms' },
    });
};
