import 'server-only';

import type { Route } from 'next';
import { redirect } from 'next/navigation';

type Props = {
    params: Promise<{ domain: string }>;
};

/**
 * Alias route for the settings shell's "General" entry — the overview card and the settings subnav
 * both link to `…/settings/general/`. General shop configuration (name, locale, basic config) is
 * authored through the shop editor, so this alias forwards there instead of 404ing on a route that
 * was never created.
 *
 * @param props - Route params carrying the tenant domain.
 * @returns Never — always redirects to the shop editor.
 */
export default async function GeneralSettingsPage({ params }: Props) {
    const { domain } = await params;
    redirect(`/${domain}/settings/shop/` as Route);
}
