'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';

/**
 * The locale scope a field surface edits under: the active editing locale
 * (from the edit page's `?locale=` after per-tenant narrowing) plus the
 * tenant's default locale (the slot legacy plain values are attributed to —
 * see `locale-bucket.ts`).
 */
export type FormLocale = {
    /** The locale whose bucket slot localized leaves read and write. */
    locale: string;
    /** The tenant default; anchors the legacy plain-value attribution. */
    defaultLocale: string;
};

const FormLocaleContext = createContext<FormLocale | null>(null);

/**
 * Provides the active editing locale to every localized leaf widget beneath it.
 * Mounted by `<EditorFields>` from the edit page's resolved locale; without a
 * provider localized leaves bind their raw (locale-shared) value, preserving
 * the pre-locale behavior for surfaces that have not opted in.
 *
 * @param props.locale - The active editing locale.
 * @param props.defaultLocale - The tenant default locale.
 * @param props.children - The field surface.
 * @returns The provider wrapping `children`.
 */
export function FormLocaleProvider({ locale, defaultLocale, children }: FormLocale & { children: ReactNode }) {
    const value = useMemo(() => ({ locale, defaultLocale }), [locale, defaultLocale]);
    return <FormLocaleContext.Provider value={value}>{children}</FormLocaleContext.Provider>;
}

/**
 * Reads the active form locale, or `null` when no {@link FormLocaleProvider}
 * wraps the caller. Null deliberately does NOT throw: locale-less surfaces
 * (unit substrates, bespoke editors over non-localized collections) keep the
 * raw leaf binding.
 *
 * @returns The provided {@link FormLocale}, or `null`.
 */
export function useFormLocale(): FormLocale | null {
    return useContext(FormLocaleContext);
}
