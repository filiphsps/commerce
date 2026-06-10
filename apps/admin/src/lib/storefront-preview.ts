import 'server-only';

import { buildPreviewActivationUrl, buildPreviewPath, type PreviewTarget } from '@nordcom/commerce-cms/editor/preview';

/**
 * Builds the storefront live-preview URL for a tenant document on the native
 * stack — the replacement for the Payload-era `buildLivePreviewUrl`, pointing
 * at the storefront's WORKING `/api/cms-preview` activation route (timing-safe
 * secret check → `draftMode().enable()` → redirect) instead of the dead
 * `/__by-tenant/…?preview=1` shape.
 *
 * Tenant resolution rides the storefront's hostname middleware: the preview
 * origin defaults to `https://<domain>` (the tenant's own storefront host, the
 * same value the admin's `[domain]` route segment carries), with
 * `STOREFRONT_BASE_URL` as the dev/platform override — tenant domains do not
 * resolve in local DNS, and the storefront's dev-host fallback picks the
 * seeded shop there.
 *
 * Server-only ON PURPOSE: the URL embeds `STOREFRONT_PREVIEW_SECRET`, so it
 * must be assembled in an RSC and handed to the client iframe as an opaque
 * string. Fail-closed: with the secret unset the URL carries an empty secret,
 * which the storefront route rejects (401) because its own expected secret is
 * also unset — draft mode can never be enabled by guessing.
 *
 * @param args - The tenant domain plus the {@link PreviewTarget} document address.
 * @param args.domain - The tenant's storefront hostname (the admin `[domain]` segment).
 * @returns The fully-assembled preview activation URL.
 */
export function buildStorefrontPreviewUrl({ domain, ...target }: PreviewTarget & { domain: string }): string {
    // An empty/whitespace override is treated as unset so a blank env line
    // can't produce an unparsable relative origin.
    const override = process.env.STOREFRONT_BASE_URL?.trim();
    const storefrontOrigin = override ? override : `https://${domain}`;
    const secret = process.env.STOREFRONT_PREVIEW_SECRET ?? '';
    return buildPreviewActivationUrl({ storefrontOrigin, secret, path: buildPreviewPath(target) });
}
