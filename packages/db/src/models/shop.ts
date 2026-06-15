import type { BaseDocument } from '../db';
import type { ShopExtensionManifest } from '../lib/extensions';
import type { AccentToken, ShopThemeTokens } from '../lib/theme';
import type { FeatureFlagBase } from './feature-flag';
import type { LegacyObjectIdRef } from './query-types';

/**
 * Auth and connection configuration for the Shopify commerce integration. Identifies the
 * storefront via `domain` and `storefrontId`, carries the Storefront API credentials, and
 * optionally includes the Customer Account API settings required for authenticated storefronts.
 * The secret members (`authentication.token`, `customers.clientSecret`) are stored split-out in the
 * Convex `shopCredentials` table and only re-attached on the server-trusted `sensitiveData` read.
 *
 * @example
 * ```ts
 * import type { ShopifyCommerceProvider } from '@nordcom/commerce-db';
 * function getPublicToken(cp: ShopifyCommerceProvider): string {
 *     return cp.authentication.publicToken;
 * }
 * ```
 */
export type ShopifyCommerceProvider = {
    type: 'shopify';
    authentication: {
        token: string;
        publicToken: string;
        domain?: string;

        customers?: {
            id: string;
            clientId: string;
            clientSecret: string;
        };
    };
    storefrontId: string;
    domain: string;
    id: string;
};
/**
 * Auth configuration shape for the Stripe commerce integration. Currently a placeholder — the
 * `authentication` object will gain Stripe-specific fields as that integration matures.
 *
 * @example
 * ```ts
 * import type { StripeCommerceProvider } from '@nordcom/commerce-db';
 * const stripe: StripeCommerceProvider = { type: 'stripe', authentication: {} };
 * ```
 */
export type StripeCommerceProvider = {
    type: 'stripe';
    authentication: {};
};
/**
 * Discriminated union of all supported commerce provider configurations. Narrow by
 * `commerceProvider.type` to access provider-specific credential fields.
 *
 * @example
 * ```ts
 * import type { CommerceProvider } from '@nordcom/commerce-db';
 * function getStorefrontToken(cp: CommerceProvider): string | undefined {
 *     return cp.type === 'shopify' ? cp.authentication.publicToken : undefined;
 * }
 * ```
 */
export type CommerceProvider = ShopifyCommerceProvider | StripeCommerceProvider;

export const CommerceProviders = ['shopify', 'stripe'] as const satisfies CommerceProvider['type'][];
/**
 * Literal union of valid commerce provider type strings, constrained to the same set as the
 * runtime `CommerceProviders` array. Use to type `commerceProvider.type` parameters in service
 * methods and admin forms without hardcoding string literals.
 *
 * @example
 * ```ts
 * import type { CommerceProviders } from '@nordcom/commerce-db';
 * function isSupported(type: string): type is CommerceProviders {
 *     return (CommerceProviders as readonly string[]).includes(type);
 * }
 * ```
 */
export type CommerceProviders = (typeof CommerceProviders)[number];

/**
 * Embedded reference in a shop's `featureFlags` array. The Convex-backed seam always resolves the
 * `shopFeatureFlags` join, so `flag` arrives as the full `FeatureFlagBase` document; the legacy
 * unpopulated-ref arm of the union (now the structural `LegacyObjectIdRef`, since the mongoose
 * `ObjectId` class left with TEARDOWN-04) is retained because consumers (e.g. the storefront's
 * flag evaluator) narrow by shape — `typeof flag === 'object' && 'key' in flag` — and must keep
 * compiling against historical unpopulated refs.
 *
 * @example
 * ```ts
 * import type { FeatureFlagRef } from '@nordcom/commerce-db';
 * function isFlagPopulated(ref: FeatureFlagRef): boolean {
 *     return typeof ref.flag === 'object' && 'key' in ref.flag;
 * }
 * ```
 */
export interface FeatureFlagRef {
    flag: LegacyObjectIdRef | FeatureFlagBase;
}

/**
 * Canonical join row relating a shop to one collaborating user. De-embedded from the prior shape
 * that nested the full `UserBase` document inside the array: a collaborator now references its user
 * by id string (`user`) — the same id-ref pattern `ReviewBase['shop']` adopted in the shop==tenant
 * collapse — paired with the permissions granted on this shop. The shop side of the relation is the
 * parent document, so a row carries only the user-side id plus its permissions and never embeds a
 * user document (so it can leak no user fields). This is the canonical join shape the Convex
 * `shopCollaborators` table stores keyed by `{ shop, user }`.
 *
 * @example
 * ```ts
 * import type { ShopCollaborator } from '@nordcom/commerce-db';
 * function collaboratorIds(collaborators: ShopCollaborator[]): string[] {
 *     return collaborators.map((c) => c.user);
 * }
 * ```
 */
export interface ShopCollaborator {
    user: string;
    permissions: string[];
}

/**
 * Raw document shape for a multi-tenant shop record. Extends `BaseDocument` with all
 * tenant-specific configuration fields including domain routing, commerce provider credentials,
 * design tokens, and feature flags. `id` is the PUBLIC shop id (the migrated Mongo `ObjectId`
 * preserved as the Convex row's `legacyId`); the Convex `_id` is never surfaced. Use `OnlineShop`
 * for client-facing work since it masks credential fields.
 *
 * @example
 * ```ts
 * import type { ShopBase } from '@nordcom/commerce-db';
 * function getDefaultLocale(shop: ShopBase): string {
 *     return shop.i18n?.defaultLocale ?? 'en-US';
 * }
 * ```
 */
export interface ShopBase extends BaseDocument {
    name: string;
    description?: string;

    domain: string;
    alternativeDomains?: string[];

    i18n?: {
        defaultLocale: string;
    };

    commerce?: {
        maxQuantity?: number;
        processingTimeInDays?: number;
    };

    showProductVendor?: boolean;

    design: {
        header: {
            logo: {
                width: number;
                height: number;
                src: string;
                alt: string;
            };
        };
        accents: AccentToken[];
    };

    /**
     * Optional per-tenant theme token overrides. Absent on every existing shop; absence resolves to
     * the platform defaults via `resolveTheme`, so an unset `theme` renders byte-identically to
     * today and needs no migration. A sibling of `design` (never a tightening of it) so the required
     * logo + accents surface is untouched.
     */
    theme?: ShopThemeTokens;

    /**
     * Optional per-tenant extension manifest — store-wide default configuration for storefront
     * blocks and components (product-card variants, section visibility, block availability, theme).
     * Absent on every existing shop; absence resolves byte-identically to today's render via
     * `resolveExtensions`. The authored, editable source behind the admin Customization hub.
     */
    extensions?: ShopExtensionManifest;

    icons?: {
        favicon?: {
            width: number;
            height: number;
            src: string;
            alt: string;
        };
    };

    commerceProvider: CommerceProvider;

    collaborators: ShopCollaborator[];

    integrations?: {
        judgeme?: {
            publicToken?: string;
        };
    };

    thirdParty?: {
        googleTagManager?: string;
        intercom?: string;
    };

    featureFlags?: FeatureFlagRef[];
}

/**
 * Client-safe shop shape returned by all `ShopService` read methods; safe to pass to Client
 * Components or server actions. Historically this stripped the hydrated Mongoose document methods
 * off `ShopBase`; the Convex-backed seam returns plain rows, so the only remaining difference is
 * that `collaborators` becomes optional. Credential fields (`authentication.token`,
 * `customers.clientSecret`) live in the split-out Convex `shopCredentials` table and are only
 * attached when `sensitiveData: true` is passed to `ShopService.findByDomain`.
 *
 * @example
 * ```ts
 * import type { OnlineShop } from '@nordcom/commerce-db';
 * function shopDomain(shop: OnlineShop): string {
 *     return shop.domain;
 * }
 * ```
 */
export type OnlineShop = Omit<ShopBase, 'collaborators'> & {
    collaborators?: ShopBase['collaborators'];
};

/**
 * Public connection state of one routable domain, as surfaced by the admin connect screen. Legacy
 * rows (no stored `status`) are coalesced by the seam to `verified`/`service_domain` — they predate
 * verification and are already live. Informational only: routing never reads it.
 *
 * @example
 * ```ts
 * import type { DomainVerification } from '@nordcom/commerce-db';
 * const isLive = (state: DomainVerification): boolean => state.status === 'verified';
 * ```
 */
export type DomainVerification = {
    domain: string;
    status: 'pending' | 'verified' | 'failed';
    via: 'vercel' | 'service_domain' | 'localhost' | null;
    verifiedAt: number | null;
    lastCheckedAt: number | null;
};

/** Write payload for `ShopService.setDomainVerification`. */
export type DomainVerificationInput = {
    status: 'pending' | 'verified' | 'failed';
    via?: 'vercel' | 'service_domain' | 'localhost';
    verifiedAt?: number;
};
