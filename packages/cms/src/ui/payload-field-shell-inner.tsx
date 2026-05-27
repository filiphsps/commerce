'use client';

import type { I18nClient, I18nOptions, Language } from '@payloadcms/translations';
import { RootProvider } from '@payloadcms/ui';
import type {
    ClientConfig,
    LanguageOptions,
    Locale,
    SanitizedPermissions,
    ServerFunctionClient,
    TypedUser,
} from 'payload';
import type { ReactNode } from 'react';

/**
 * Theme variant for the embedded Payload shell. Passed directly to Payload's
 * `<RootProvider theme>` and should match the `data-theme` attribute on the
 * `<html>` element so component and layout token ramps agree.
 *
 * @example
 * <PayloadFieldShell theme="dark" {...rest} />
 */
export type PayloadFieldShellTheme = 'dark' | 'light';

/**
 * Props for {@link PayloadFieldShell} and its client-side inner component.
 * Bundles the minimal Payload context needed when embedding field components
 * outside the canonical `@payloadcms/next` admin shell. Every property is
 * RSC-serializable so the shell can be rendered server-side and streamed.
 *
 * @example
 * <PayloadFieldShell
 *   config={clientConfig}
 *   serverFunction={handleServerFunction}
 *   dateFNSKey={req.i18n.dateFNSKey}
 *   fallbackLang={config.i18n.fallbackLanguage}
 *   languageCode="en"
 *   languageOptions={languageOptions}
 *   permissions={permissions}
 *   theme="dark"
 *   translations={req.i18n.translations}
 *   user={req.user}
 * >
 *   {children}
 * </PayloadFieldShell>
 */
export type PayloadFieldShellProps = {
    /**
     * The Payload `ClientConfig` for the current request — produced by
     * `getClientConfig()` from `@payloadcms/ui/utilities/getClientConfig`.
     */
    config: ClientConfig;
    /**
     * Server action that dispatches into Payload's server-function registry
     * (form-state, render-document, schedule-publish, …). Apps build this via
     * `createCmsServerFunctionHandler` from `@nordcom/commerce-cms/server-functions`
     * wrapped in a `'use server'` module so it crosses the RSC boundary.
     */
    serverFunction: ServerFunctionClient;
    /** Date-fns locale key for the current request, from `req.i18n.dateFNSKey`. */
    dateFNSKey: Language['dateFNSKey'];
    /** Fallback language code, from `config.i18n.fallbackLanguage`. */
    fallbackLang: I18nOptions['fallbackLanguage'];
    /** Active UI language code (e.g. `en`, `de`). */
    languageCode: string;
    /** Available admin languages, derived from `config.i18n.supportedLanguages`. */
    languageOptions: LanguageOptions;
    /** Optional document/data locale code (per-tenant, distinct from UI language). */
    locale?: Locale['code'];
    /** Sanitized RBAC permissions for the current user. */
    permissions: SanitizedPermissions;
    /** UI theme. */
    theme: PayloadFieldShellTheme;
    /** Translations for the active language (`req.i18n.translations`). */
    translations: I18nClient['translations'];
    /** Authenticated Payload user, or `null` for anonymous routes. */
    user: null | TypedUser;
    children: ReactNode;
};

/**
 * Internal client implementation of `<PayloadFieldShell>`. Imported only by
 * the server-component entry in `./payload-field-shell.tsx`, which owns the
 * CSS side-effect import. Mounting this directly bypasses that import and
 * loses Payload's bundled stylesheet — do not consume from app code.
 *
 * @see ./payload-field-shell.tsx for the public entry + design rationale
 */
export function PayloadFieldShellInner({
    config,
    serverFunction,
    dateFNSKey,
    fallbackLang,
    languageCode,
    languageOptions,
    locale,
    permissions,
    theme,
    translations,
    user,
    children,
}: PayloadFieldShellProps) {
    return (
        <RootProvider
            config={config}
            dateFNSKey={dateFNSKey}
            fallbackLang={fallbackLang}
            languageCode={languageCode}
            languageOptions={languageOptions}
            locale={locale}
            permissions={permissions}
            serverFunction={serverFunction}
            theme={theme}
            translations={translations}
            user={user}
        >
            {children}
        </RootProvider>
    );
}
