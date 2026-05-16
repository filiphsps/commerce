import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { resendAdapter } from '@payloadcms/email-resend';
import { getTenantFromCookie } from '@payloadcms/plugin-multi-tenant/utilities';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { AuthStrategy, SanitizedConfig } from 'payload';
import { buildConfig } from 'payload';
import { buildBridgePlugin } from '../bridge';
import { defaultManifests } from '../bridge/manifests';
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
    /**
     * When false, skip registering the bridge plugin / default manifests.
     * Default true. The bridge plugin synthesizes hidden collections with
     * colon-prefixed slugs (e.g. `bridge:shop`) — Payload's `generate:types`
     * mangles those into a non-generic `Select` interface whose call sites
     * reference it as generic, so the generated `payload-types.ts` fails
     * `tsc`. `generate-types-config.ts` passes `includeBridge: false` for a
     * clean output; runtime apps leave it at the default.
     */
    includeBridge?: boolean;
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
    /**
     * Optional `sharp` instance to enable image resizing. Payload doesn't
     * auto-detect the package — without this it logs "Image resizing is
     * enabled for one or more collections, but sharp not installed" on
     * every boot and the upload-resize pipeline silently no-ops. Pass the
     * default `import sharp from 'sharp'` from the consuming app.
     */
    // biome-ignore lint/suspicious/noExplicitAny: sharp's type is unwieldy and we only forward it
    sharp?: any;
    /**
     * Absolute path where `payload generate:types` should write its output.
     * Set only by the dedicated type-gen entry config — Payload ignores the
     * CLI `--output` flag and falls back to `<cwd>/payload-types.ts`, so the
     * destination has to be threaded through here.
     */
    typescriptOutputFile?: string;
};

import { cmsDefaultLocale as DEFAULT_DEFAULT_LOCALE, cmsDefaultLocales as DEFAULT_LOCALES } from './locales';

export {
    cmsDefaultLocale,
    cmsDefaultLocales,
    isValidLocale,
    resolveCmsDefaultLocale,
    resolveCmsLocales,
} from './locales';

export const buildPayloadConfig = async ({
    secret,
    mongoUrl,
    serverUrl,
    includeAdmin = true,
    enableStorage = true,
    includeBridge = true,
    locales = DEFAULT_LOCALES,
    defaultLocale = DEFAULT_DEFAULT_LOCALE,
    authStrategies,
    disablePasswordLogin,
    importMapBaseDir,
    importMapFile,
    livePreview,
    sharp,
    typescriptOutputFile,
}: BuildPayloadConfigOptions): Promise<SanitizedConfig> => {
    const plugins = [buildMultiTenantPlugin()];
    if (includeBridge) plugins.push(buildBridgePlugin(defaultManifests));
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
                  // Pin Payload's theme to dark to match the host admin app.
                  // Our `(app)` route group hardcodes dark color tokens in
                  // `globals.css` (`:root { --background: 0 0% 0%; ... }`);
                  // without this, Payload's `<ThemeProvider>` defaults to
                  // `'light'` and its field CSS (input backgrounds, label
                  // colors, focus rings) clashes — most visibly the input
                  // text rendering near-white on a near-white field
                  // background, making form values unreadable.
                  // Setting `theme: 'dark'` also makes `getRequestTheme`
                  // short-circuit and ignore the `payload-theme` cookie /
                  // `Sec-CH-Prefers-Color-Scheme` header, so the value
                  // never drifts back to light mid-session.
                  theme: 'dark' as const,
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
        email: resendAdapter({
            defaultFromAddress: '',
            defaultFromName: '',
            apiKey: process.env.RESEND_API_KEY || '',
        }),

        editor: lexicalEditor({}),
        collections,
        localization: {
            locales,
            defaultLocale,
            fallback: true,
            /**
             * Narrow the admin's locale picker to the active tenant's
             * `locales` field. Payload's global `locales` array is fixed at
             * boot (we ship the full ISO 639-1 superset for that), but
             * `filterAvailableLocales` runs per-request and lets us hide
             * everything outside the current tenant's allow-list. The
             * multi-tenant plugin sets a `payload-tenant` cookie from the
             * admin's tenant selector; without it (e.g. cross-tenant admin
             * routes) we return the full superset so the picker still has
             * options.
             *
             * Tenant IDs default to MongoDB ObjectIDs — `'text'` for the
             * `idType` argument expected by `getTenantFromCookie`.
             */
            filterAvailableLocales: async ({ req, locales: available }) => {
                const tenantId = getTenantFromCookie(req.headers, 'text');
                if (!tenantId) return available;
                try {
                    const tenant = (await req.payload.findByID({
                        id: String(tenantId),
                        collection: 'tenants',
                        depth: 0,
                        req,
                    })) as { locales?: string[] } | null;
                    const allowed = tenant?.locales;
                    if (!allowed || allowed.length === 0) return available;
                    const filtered = available.filter((locale) => allowed.includes(locale.code));
                    return filtered.length > 0 ? filtered : available;
                } catch {
                    // Tenant lookup failed (deleted, permission denied, etc.) —
                    // fail open with the full superset rather than locking the
                    // editor out of every locale.
                    return available;
                }
            },
        },
        plugins,
        ...adminConfig,
        ...(sharp ? { sharp } : {}),
        ...(typescriptOutputFile ? { typescript: { outputFile: typescriptOutputFile } } : {}),
        routes: { admin: '/cms' },
    });
};
