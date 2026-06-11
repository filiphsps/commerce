import 'server-only';

import type { Route } from 'next';
import { redirect } from 'next/navigation';

type Props = {
    params: Promise<{ domain: string }>;
};

/**
 * Alias route for the editor shell's conventional `…/new/` link: creating media IS uploading on
 * the native CMSGATE-02 pipeline, so the list page's "New Media" action lands on the upload form
 * instead of a generic document form that could never produce a `cmsMedia` row.
 *
 * @param props - Route params carrying the tenant domain.
 * @returns Never — always redirects to the upload page.
 */
export default async function NewMediaPage({ params }: Props) {
    const { domain } = await params;
    redirect(`/${domain}/settings/media/upload/` as Route);
}
