import type { CommerceProviders } from '@nordcom/commerce-db';

/** The full payload the wizard submits to `createShop`. */
export type CreateShopInput = {
    name: string;
    domain: string;
    locale: string;
    provider: { type: CommerceProviders; values: Record<string, string> };
    /** Chosen accent colors, or `null` when the branding step was skipped. */
    branding: { primaryColor: string; secondaryColor: string } | null;
};

/**
 * `createShop` resolves to a failure object only — success redirects to the new shop's dashboard and the
 * promise never settles normally on that path.
 */
export type CreateShopResult = { ok: false; error: string };
