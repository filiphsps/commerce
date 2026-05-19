'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type LocaleOption = {
    /** BCP-47 locale code, e.g. "en-US". */
    code: string;
    /** Human-readable label, e.g. "English". */
    label: string;
};

export type LocaleSwitcherProps = {
    /** Available locale options to switch between. */
    locales: LocaleOption[];
    /** Currently selected locale code. */
    currentLocale: string;
};

/**
 * Locale switcher for document edit pages.
 *
 * Replaces the `locale` search param in the current URL without a hard
 * navigation, preserving all other existing query parameters.
 *
 * Uses a native `<select>` styled with Tailwind — Nordstar does not export a
 * `<Select>` component.
 */
export function LocaleSwitcher({ locales, currentLocale }: LocaleSwitcherProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('locale', e.target.value);
        router.replace(`${pathname}?${params.toString()}` as Route);
    };

    return (
        <div className="flex items-center gap-2">
            <label htmlFor="locale-switcher" className="text-muted-foreground text-sm">
                Locale
            </label>
            <select
                id="locale-switcher"
                value={currentLocale}
                onChange={handleChange}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
                {locales.map((locale) => (
                    <option key={locale.code} value={locale.code}>
                        {locale.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
