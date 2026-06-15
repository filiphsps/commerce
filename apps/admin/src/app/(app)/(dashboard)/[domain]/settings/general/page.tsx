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
 * The PRIMARY alias is the routing-layer `redirects()` rule in `next.config.js`, which issues a clean
 * 307 before this page renders. This in-component `redirect()` is a defensive fallback for when the
 * config rule is bypassed — note it degrades to a 1s `<meta http-equiv="refresh">` because it fires
 * from inside the already-streamed dashboard shell, so the config rule must stay the real path.
 *
 * @param props - Route params carrying the tenant domain.
 * @returns Never — always redirects to the shop editor.
 */
export default async function GeneralSettingsPage({ params }: Props) {
    const { domain } = await params;
    redirect(`/${domain}/settings/shop/` as Route);
}
