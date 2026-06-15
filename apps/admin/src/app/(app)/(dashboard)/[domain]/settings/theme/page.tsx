import 'server-only';

import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Theme' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
};

/**
 * Legacy theme-editor route. The theme catalog is now the Theme tab of the unified Customization hub
 * (`/settings/customization/`), so this route redirects there, preserving the active `locale`. Kept as
 * a redirect rather than deleted so existing links and bookmarks keep working.
 *
 * @param props.params - Route params resolving to the tenant `domain`.
 * @param props.searchParams - Forwarded `?locale=…` preserved across the redirect.
 * @returns Never returns — issues a redirect to the Customization hub.
 */
export default async function ThemeSettingsPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const { locale } = await searchParams;
    const query = locale ? `?tab=theme&locale=${encodeURIComponent(locale)}` : '?tab=theme';
    redirect(`/${domain}/settings/customization/${query}` as Route);
}
