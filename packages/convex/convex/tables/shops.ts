import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';

import {
    accentTokenValidator,
    featureFlagOptionValidator,
    jsonValueValidator,
    shopThemeTokensValidator,
    targetingRuleValidator,
} from '../lib/validators';

/**
 * Mongo `timestamps: true` carries `createdAt`/`updatedAt` on every `@nordcom/commerce-db` document.
 * Convex's own `_creationTime` reflects the INSERT moment — which, for migrated rows, is the migration
 * run, not the original creation — so the source timestamps are preserved as explicit numeric (epoch-ms)
 * fields rather than relying on `_creationTime`. Shared so every shop-family row mirrors the same
 * managed-timestamp contract as the auth tables.
 */
const timestampFields = {
    createdAt: v.number(),
    updatedAt: v.number(),
};

/**
 * A sized, captioned image asset, mirroring the repeated `{ width, height, src, alt }` shape on
 * `ShopBase.design.header.logo` and `ShopBase.icons.favicon` in `@nordcom/commerce-db`'s `shop.ts`.
 */
const imageAssetValidator = v.object({
    width: v.number(),
    height: v.number(),
    src: v.string(),
    alt: v.string(),
});

/**
 * Required brand-design surface, mirroring `ShopBase['design']`: the header logo asset plus the ordered
 * `accents` swatch list. This is the untouched, always-present source the optional `theme` override
 * (and `resolveTheme`) layers on top of, so it stays required exactly as the source schema demands.
 */
const shopDesignValidator = v.object({
    header: v.object({ logo: imageAssetValidator }),
    accents: v.array(accentTokenValidator),
});

/**
 * Optional icon assets, mirroring `ShopBase['icons']` (currently just an optional `favicon`).
 */
const shopIconsValidator = v.object({
    favicon: v.optional(imageAssetValidator),
});

/**
 * Locale configuration, mirroring `ShopBase['i18n']`. The shop default locale anchors the
 * `request locale → shop default → platform default` fallback chain.
 */
const shopI18nValidator = v.object({
    defaultLocale: v.string(),
});

/**
 * Storefront commerce tuning, mirroring `ShopBase['commerce']`: the optional cart `maxQuantity` cap,
 * `processingTimeInDays` estimate, catalog `productsPerPage`, `geoRedirectDismissalHours` banner TTL,
 * the default presentment `currency`, and the per-currency `freeShippingThresholds` messaging list.
 * The threshold rows store no `id` (mirroring {@link accentTokenValidator}): the codegen
 * content-type's `id?` is a read-only artifact the upsert strips before write.
 */
const shopCommerceValidator = v.object({
    maxQuantity: v.optional(v.number()),
    processingTimeInDays: v.optional(v.number()),
    productsPerPage: v.optional(v.number()),
    geoRedirectDismissalHours: v.optional(v.number()),
    currency: v.optional(v.string()),
    freeShippingThresholds: v.optional(v.array(v.object({ currencyCode: v.string(), amount: v.number() }))),
});

/**
 * Third-party integration tokens, mirroring `ShopBase['integrations']` (currently the optional Judge.me
 * public token). `judgeme.publicToken` is a PUBLIC token, so it is NOT a masked credential and stays on
 * the shop row — unlike `commerceProvider.authentication.token`, which is shredded into
 * {@link shopCredentialsValidator}.
 */
const shopIntegrationsValidator = v.object({
    judgeme: v.optional(v.object({ publicToken: v.optional(v.string()) })),
});

/**
 * Analytics/support script ids, mirroring `ShopBase['thirdParty']`: the optional Google Tag Manager and
 * Intercom identifiers.
 */
const shopThirdPartyValidator = v.object({
    googleTagManager: v.optional(v.string()),
    intercom: v.optional(v.string()),
});

/**
 * Shopify commerce provider configuration, mirroring `ShopifyCommerceProvider` from
 * `@nordcom/commerce-db` MINUS the two masked credentials. `authentication.token` (the private
 * Storefront token) and `authentication.customers.clientSecret` are SPLIT OUT into the 1:1
 * {@link shopCredentialsValidator} table, structurally mirroring the `docToOnlineShop` masking
 * boundary: the public shop row physically cannot carry a secret, so a public read can never leak one
 * (replacing read-time delete-key masking with a separate, RLS-deniable table). The retained
 * `authentication.publicToken` and `customers.{id,clientId}` are NON-secret and stay on the row.
 */
const shopifyCommerceProviderValidator = v.object({
    type: v.literal('shopify'),
    authentication: v.object({
        publicToken: v.string(),
        domain: v.optional(v.string()),
        customers: v.optional(
            v.object({
                id: v.string(),
                clientId: v.string(),
            }),
        ),
    }),
    storefrontId: v.string(),
    domain: v.string(),
    id: v.string(),
});

/**
 * Stripe commerce provider configuration, mirroring `StripeCommerceProvider`: a placeholder whose
 * `authentication` object will gain Stripe-specific fields as that integration matures. It carries no
 * secret today, so it has no {@link shopCredentialsValidator} counterpart.
 */
const stripeCommerceProviderValidator = v.object({
    type: v.literal('stripe'),
    authentication: v.object({}),
});

/**
 * Discriminated union of supported commerce providers, mirroring `CommerceProvider`. Narrow by `type`.
 * Both arms have already had their masked credentials shredded into {@link shopCredentialsValidator}.
 */
const commerceProviderValidator = v.union(shopifyCommerceProviderValidator, stripeCommerceProviderValidator);

/**
 * Stored row shape for a multi-tenant shop, the canonical collapse of the former `shop` AND `tenant`
 * records into ONE row (UNIFY-03): the tenant identity IS this row's Convex `_id`, so the
 * `plugin-multi-tenant` `tenantsSlug` points at `shops` and the old `tenants.slug`/`shopId` indirection
 * is gone. Mirrors the SFREAD-02-frozen `ShopBase`/`OnlineShop` shape from `@nordcom/commerce-db` with
 * three structural changes that mirror the de-embeddings the rest of the migration performs:
 *
 * - `legacyId` preserves the source Mongo `ObjectId` string. The query layer projects IT to `shop.id`
 *   (never Convex's branded `_id`), keeping the ~183-importer `shop.id` string contract and every
 *   externally-persisted shop reference (sessions, carts, Shopify metafields, ISR output) stable.
 * - `commerceProvider`'s `token` + `customers.clientSecret` are SPLIT OUT to {@link shopCredentialsValidator}
 *   so the public row carries no secret (see {@link shopifyCommerceProviderValidator}).
 * - `collaborators` and `featureFlags` are de-embedded into {@link shopCollaboratorValidator} and
 *   {@link shopFeatureFlagValidator} join rows; the array of routable domains is de-embedded into
 *   {@link shopDomainValidator} (Convex cannot index array membership, the `findByDomain` hot path).
 *   The primary `domain` and `alternativeDomains` remain on the row to preserve the `ShopBase` shape.
 */
export const shopValidator = v.object({
    legacyId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    domain: v.string(),
    alternativeDomains: v.optional(v.array(v.string())),
    i18n: v.optional(shopI18nValidator),
    commerce: v.optional(shopCommerceValidator),
    showProductVendor: v.optional(v.boolean()),
    design: shopDesignValidator,
    theme: v.optional(shopThemeTokensValidator),
    icons: v.optional(shopIconsValidator),
    commerceProvider: commerceProviderValidator,
    integrations: v.optional(shopIntegrationsValidator),
    thirdParty: v.optional(shopThirdPartyValidator),
    ...timestampFields,
});

/**
 * Inferred row shape for a shop, the Convex-side mirror of `ShopBase`. See {@link shopValidator}.
 */
export type ShopBase = Infer<typeof shopValidator>;

/**
 * Stored row shape for a shop's split-out commerce credentials — a SEPARATE 1:1 table (`by_shop`)
 * holding `commerceProvider.authentication.token` and `customers.clientSecret`. Structurally shredding
 * the secrets off the shop row (rather than masking them at read time as `docToOnlineShop` did) means
 * the public `shops` query physically cannot read them. Both are optional: a shop may have a private
 * token but no Customer Account API, or neither. The 1:1 relationship is enforced in the mutation layer.
 */
export const shopCredentialsValidator = v.object({
    shop: v.id('shops'),
    token: v.optional(v.string()),
    clientSecret: v.optional(v.string()),
});

/**
 * Inferred row shape for a shop's split-out credentials. See {@link shopCredentialsValidator}.
 */
export type ShopCredentials = Infer<typeof shopCredentialsValidator>;

/**
 * Stored row shape for a single routable domain → shop mapping. De-embeds the Mongo
 * `$or:[{domain},{alternativeDomains:domain}]` lookup into one row per domain because Convex cannot
 * index array membership; `by_domain` is the `findByDomain` hot path SPIKE-01 measured. One row exists
 * per shop's primary `domain` AND each `alternativeDomains` entry. Global uniqueness of `domain` is
 * enforced at write time, and stale rows are reconciled (delete-diff) when a shop's domain set shrinks.
 */
export const shopDomainValidator = v.object({
    shop: v.id('shops'),
    domain: v.string(),
});

/**
 * Inferred row shape for a domain → shop mapping. See {@link shopDomainValidator}.
 */
export type ShopDomain = Infer<typeof shopDomainValidator>;

/**
 * Stored row shape for one shop↔user collaboration, mirroring the UNIFY-11 `ShopCollaborator` join: the
 * embedded collaborators array is de-embedded into rows of `{ shop, user, permissions }`. The shop side
 * is a real `v.id('shops')` and `user` is a `v.id('users')` foreign key (both tables live in this
 * schema), expressing the UNIFY-11 user id-ref as the idiomatic branded Convex id — consistent with the
 * auth `sessions.user`/`reviews.shopId` references. A row embeds NO user document, only the id and the
 * permissions granted on this shop, so it can leak no user fields.
 */
export const shopCollaboratorValidator = v.object({
    shop: v.id('shops'),
    user: v.id('users'),
    permissions: v.array(v.string()),
});

/**
 * Inferred row shape for a shop↔user collaboration. See {@link shopCollaboratorValidator}.
 */
export type ShopCollaborator = Infer<typeof shopCollaboratorValidator>;

/**
 * Stored row shape for the shop↔feature-flag join, de-embedding `ShopBase.featureFlags` (`FeatureFlagRef[]`)
 * into rows of `{ shop, flag }`. `flag` is a real `v.id('featureFlags')` reference to the global
 * {@link featureFlagValidator} table (both live in this schema) — the migrated, resolved analogue of
 * Mongo's `featureFlags.flag` `ObjectId` populated via `populate('featureFlags.flag')`.
 */
export const shopFeatureFlagValidator = v.object({
    shop: v.id('shops'),
    flag: v.id('featureFlags'),
});

/**
 * Inferred row shape for a shop↔feature-flag join. See {@link shopFeatureFlagValidator}.
 */
export type ShopFeatureFlag = Infer<typeof shopFeatureFlagValidator>;

/**
 * Discriminator for a feature flag, mirroring `FeatureFlagKind` from `@nordcom/commerce-db`. Optional on
 * the row so existing rows and new behavior flags persist no value rather than a migrated default.
 */
const featureFlagKindValidator = v.union(v.literal('behavior'), v.literal('section'));

/**
 * Stored row shape for a platform-global feature flag, mirroring `FeatureFlagBase` from
 * `@nordcom/commerce-db`'s `feature-flag.ts`: a unique `key`, the optional `kind` discriminator and
 * `description`, the required `Mixed` `defaultValue`, the optional enum-style `options`, and the
 * `targeting` rule list. `legacyId` preserves the source Mongo `ObjectId` (projected to `id`, mirroring
 * the shop id contract) so `shopFeatureFlags.flag` references resolve through migration. `key`
 * uniqueness — a Mongo unique index — is enforced in the mutation layer, not by the `by_key` index.
 */
export const featureFlagValidator = v.object({
    legacyId: v.string(),
    key: v.string(),
    kind: v.optional(featureFlagKindValidator),
    description: v.optional(v.string()),
    defaultValue: jsonValueValidator,
    options: v.optional(v.array(featureFlagOptionValidator)),
    targeting: v.array(targetingRuleValidator),
    ...timestampFields,
});

/**
 * Inferred row shape for a global feature flag, mirroring `FeatureFlagBase`. See {@link featureFlagValidator}.
 */
export type FeatureFlagBase = Infer<typeof featureFlagValidator>;

/**
 * Shop table. `by_legacy_id` resolves a shop by its external Mongo-id `shop.id`; routing-by-domain goes
 * through {@link shopDomainsTable} (`by_domain`), not this table, so the row needs no domain index.
 */
const shopsTable = defineTable(shopValidator).index('by_legacy_id', ['legacyId']);

/**
 * Split-out credentials table (1:1 per shop). `by_shop` is the only access path; the public shop read
 * never touches this table.
 */
const shopCredentialsTable = defineTable(shopCredentialsValidator).index('by_shop', ['shop']);

/**
 * Routable domain table. `by_domain` backs the `findByDomain` hot path (one indexed lookup replacing the
 * Mongo `$or` array scan); `by_shop` lists a shop's domains for the domain-set reconciliation delete-diff.
 */
const shopDomainsTable = defineTable(shopDomainValidator).index('by_domain', ['domain']).index('by_shop', ['shop']);

/**
 * Collaborator join table. `by_user` backs `findByCollaborator` (a user's shops), `by_shop` lists a
 * shop's collaborators, and the `by_shop_user` compound backs the `{ shop, user }` membership check and
 * the mutation-layer uniqueness of that pair.
 */
const shopCollaboratorsTable = defineTable(shopCollaboratorValidator)
    .index('by_user', ['user'])
    .index('by_shop', ['shop'])
    .index('by_shop_user', ['shop', 'user']);

/**
 * Feature-flag join table. `by_shop` lists a shop's enabled flags; the `by_shop_flag` compound backs the
 * `{ shop, flag }` membership check and the mutation-layer uniqueness of that pair.
 */
const shopFeatureFlagsTable = defineTable(shopFeatureFlagValidator)
    .index('by_shop', ['shop'])
    .index('by_shop_flag', ['shop', 'flag']);

/**
 * Global feature-flag table. `by_key` backs key lookup (the source's unique index; uniqueness enforced
 * in the mutation layer), and `by_legacy_id` resolves the migrated Mongo id for `shopFeatureFlags.flag`.
 */
const featureFlagsTable = defineTable(featureFlagValidator)
    .index('by_key', ['key'])
    .index('by_legacy_id', ['legacyId']);

/**
 * The shop-family table group: the collapsed shop==tenant `shops` row, its split-out `shopCredentials`,
 * the `shopDomains` routing index, the `shopCollaborators` and `shopFeatureFlags` de-embedded joins, and
 * the platform-global `featureFlags`. Spread into `coreTables` via `tables/index.ts`, then into
 * `defineSchema`. Every tenant-scoped member indexes its `shop` foreign key (`by_shop` / `by_shop_*`)
 * per the multi-tenant index convention; `shops` and `featureFlags` are tenant roots / platform-global
 * and key on `legacyId`/`key` instead.
 */
export const shopTables = {
    shops: shopsTable,
    shopCredentials: shopCredentialsTable,
    shopDomains: shopDomainsTable,
    shopCollaborators: shopCollaboratorsTable,
    shopFeatureFlags: shopFeatureFlagsTable,
    featureFlags: featureFlagsTable,
};
