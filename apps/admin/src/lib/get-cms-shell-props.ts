import 'server-only';

import { buildPayloadClientConfig, type PayloadFieldShellProps } from '@nordcom/commerce-cms/ui';
import { headers as getHeaders } from 'next/headers';
import type { PayloadRequest } from 'payload';
import { createLocalReq, getAccessResults, getLocalI18n, getRequestLanguage } from 'payload';
import { parseCookies } from 'payload/shared';
import { cache } from 'react';
import { cmsServerFunction } from './cms-server-function';
import { getAuthedPayloadCtx } from './payload-ctx';

const ACCEPTED_THEMES = ['dark', 'light'] as const;
type ShellTheme = (typeof ACCEPTED_THEMES)[number];

/**
 * Resolves the Payload editor theme from config, cookie, and Sec-CH-Prefers-Color-Scheme header (in priority order).
 *
 * @param options.configTheme - Theme locked in payload.config.admin.theme, if any.
 * @param options.cookiePrefix - Cookie name prefix used to derive the theme cookie key.
 * @param options.cookies - Parsed cookie map from the current request.
 * @param options.headers - Request headers for the Sec-CH-Prefers-Color-Scheme hint.
 * @returns The resolved ShellTheme ('dark' or 'light').
 */
const resolveTheme = ({
    configTheme,
    cookiePrefix,
    cookies,
    headers,
}: {
    configTheme: 'all' | ShellTheme | undefined;
    cookiePrefix: string;
    cookies: Map<string, string>;
    headers: Request['headers'];
}): ShellTheme => {
    if (configTheme && configTheme !== 'all' && (ACCEPTED_THEMES as readonly string[]).includes(configTheme)) {
        return configTheme;
    }
    const cookieTheme = cookies.get(`${cookiePrefix}-theme`);
    if (cookieTheme && (ACCEPTED_THEMES as readonly string[]).includes(cookieTheme)) {
        return cookieTheme as ShellTheme;
    }
    const headerTheme = headers.get('Sec-CH-Prefers-Color-Scheme');
    if (headerTheme && (ACCEPTED_THEMES as readonly string[]).includes(headerTheme)) {
        return headerTheme as ShellTheme;
    }
    // Payload's exported `defaultTheme` constant is 'light'; inlined so this DI
    // module carries no @payloadcms/ui import (CMSDATA-06 grep gate).
    return 'light';
};

/**
 * Build the prop bag `<PayloadFieldShell>` expects. The shell delegates to
 * `<RootProvider>` from `@payloadcms/ui`, which mounts the BUNDLED
 * `ModalProvider` (the only `ModalContext` instance that `useDocumentDrawer`
 * + `<Drawer>` inside @payloadcms/ui actually read from). Skipping any of
 * these props would either fail typecheck or strand Payload field
 * components without context they read at first paint.
 *
 * Pass `domain` from tenant-scoped routes (e.g. `[domain]/content/...`) so
 * the underlying `getAuthedPayloadCtx` call resolves the tenant and gates
 * access against it. Omitting `domain` returns a cross-tenant prop bag —
 * appropriate only for admin-only routes that legitimately operate outside
 * a single tenant.
 *
 * TEMPORARY ADAPTER (CMSDATA-06): the prop bag stays Payload-shaped because
 * the not-yet-rebuilt shell pages (and `<PayloadFieldShell>`) still consume
 * it; the Payload coupling is reached through the
 * `@nordcom/commerce-cms/ui` re-export so this DI module itself carries no
 * `@payloadcms/ui` import. CMSDATA-07's shell rebind replaces the bag.
 *
 * @param domain - Tenant domain for tenant-scoped routes; omit for cross-tenant admin routes.
 * @param locale - Locale string forwarded to PayloadFieldShell for locale-aware fields.
 * @returns The complete prop bag for PayloadFieldShell, excluding the children prop.
 */
export const getCmsShellProps = cache(
    async (domain?: string, locale?: string): Promise<Omit<PayloadFieldShellProps, 'children'>> => {
        const { payload, user } = await getAuthedPayloadCtx(domain);

        const headers = await getHeaders();
        const cookies = parseCookies(headers);
        const languageCode = getRequestLanguage({ config: payload.config, cookies, headers });
        // `getLocalI18n` returns the broader `I18n`; `RootProvider.translations`
        // and `req.i18n` consume the narrower `I18nClient`. They're the same
        // object at runtime — `@payloadcms/next/initReq` does the same dance.
        const i18n = (await getLocalI18n({ config: payload.config, language: languageCode })) as PayloadRequest['i18n'];
        const req = await createLocalReq({ req: { i18n, user: user as never } }, payload);

        const config = buildPayloadClientConfig({
            config: payload.config,
            i18n: req.i18n,
            importMap: payload.importMap,
            user: user as never,
        });

        const permissions = await getAccessResults({ req });

        // `LanguageOptions['value']` is narrowed to Payload's supported-language
        // union (`'en' | 'de' | ...`). We iterate the runtime supportedLanguages
        // map and cast at the boundary — the values come from the same config
        // table TS uses to build that union, so they're equivalent at runtime.
        type LanguageOption = PayloadFieldShellProps['languageOptions'][number];
        type LanguageEntry = NonNullable<
            (typeof payload.config.i18n.supportedLanguages)[keyof typeof payload.config.i18n.supportedLanguages]
        >;
        const languageOptions: PayloadFieldShellProps['languageOptions'] = Object.entries(
            payload.config.i18n.supportedLanguages || {},
        )
            .filter(([, langConfig]) => langConfig !== undefined)
            .map(([language, langConfig]) => ({
                label: (langConfig as LanguageEntry).translations.general.thisLanguage,
                value: language as LanguageOption['value'],
            }));

        // The admin app's color tokens (`globals.css :root`) are hardcoded dark.
        // `resolveTheme` only matters as a fallback for callers whose admin
        // config doesn't pin a theme; we still call it to honor any future
        // override but force dark when the Payload config has `admin.theme:
        // 'dark'` (it currently does — see `buildPayloadConfig`).
        const configTheme = payload.config.admin?.theme as 'all' | ShellTheme | undefined;
        const theme: ShellTheme =
            configTheme === 'dark' || configTheme === 'light'
                ? configTheme
                : resolveTheme({
                      configTheme,
                      cookiePrefix: payload.config.cookiePrefix || 'payload',
                      cookies,
                      headers,
                  });

        return {
            config,
            serverFunction: cmsServerFunction,
            dateFNSKey: req.i18n.dateFNSKey,
            fallbackLang: payload.config.i18n.fallbackLanguage,
            languageCode,
            languageOptions,
            ...(locale ? { locale } : {}),
            permissions,
            theme,
            translations: req.i18n.translations,
            user: user as never,
        };
    },
);
