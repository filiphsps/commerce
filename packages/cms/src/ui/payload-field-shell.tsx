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

export type PayloadFieldShellTheme = 'dark' | 'light';

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
 * Provider shell required by Payload field components and `<Form>` when
 * embedded outside the canonical `@payloadcms/next` admin shell.
 *
 * Delegates to `<RootProvider>` from `@payloadcms/ui`. That provider mounts
 * the BUNDLED copy of `@faceless-ui/modal`'s `ModalProvider` — the same
 * module instance that `useDocumentDrawer`, `<Drawer>`, and `<ModalContainer>`
 * inside `@payloadcms/ui` read from. Mounting `<ModalProvider>` directly
 * from `@faceless-ui/modal` (or via any path outside `@payloadcms/ui`'s
 * pre-bundled module graph) produces a *separate* `ModalContext` instance —
 * the provider sets one context but consumers read another (its default
 * empty object), leaving `modalState` undefined and crashing
 * `modalState[drawerSlug]` in `Drawer` on first paint of any upload, blocks,
 * or relationship field.
 *
 * `<RootProvider>` also mounts `ConfigProvider`, `ServerFunctionsProvider`,
 * `UploadHandlersProvider`, `AuthProvider`, `TranslationProvider`, theme
 * context, and all the other context entries Payload's field internals
 * read. Mounting individual providers piecemeal is brittle precisely
 * because @payloadcms/ui ships a single bundled module graph — every
 * context the bundle uses must come from the bundle.
 */
export function PayloadFieldShell({
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
