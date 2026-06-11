// Leaf import — the package barrel pulls in mongoose/services guarded by
// `server-only`, which the plain-tsx `cms:generate` cannot load.
import { FONT_FAMILIES } from '@nordcom/commerce-db/lib/theme';
import type { CollectionConfig } from 'payload';
import { convexCutoverLocked } from '../access';
import { arrayField, groupField, numberField, required, selectField, textareaField, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';
import { rejectSecretWritesFromNonAdmins, stripSecretsOnRead } from './shops/secrets';

/**
 * Payload select options for the theme font fields, derived from the shared `FONT_FAMILIES`
 * allowlist in `@nordcom/commerce-db` so the CMS and the storefront `next/font` loader stay in
 * lockstep on a single set of keys.
 */
const FONT_FAMILY_OPTIONS = Object.entries(FONT_FAMILIES).map(([value, label]) => ({ label, value }));

/**
 * Payload collection config for `shops`. Mirrors the MongoDB `Shop` document
 * managed by `@nordcom/commerce-db`. Stores editable surface fields (name,
 * domain, design) plus read-only commerce-provider secrets guarded by
 * `rejectSecretWritesFromNonAdmins` and `stripSecretsOnRead` hooks.
 *
 * CUTOVER-06: shop data lives on the core Convex `shops` table behind the
 * `db/shops`/`db/shop_write` seam; the admin's shop/theme settings author
 * through the native editor and the Convex bridge. Every Payload write
 * operation is `convexCutoverLocked` (the secret-guard hooks stay as defense
 * in depth on the dead path); reads stay authed-only for `payload-ctx`'s
 * tenancy resolution until TEARDOWN-02 removes the Payload boot path.
 */
export const shops: CollectionConfig = {
    slug: 'shops',
    admin: { useAsTitle: 'name', defaultColumns: ['name', 'domain', 'updatedAt'], hidden: true },
    access: {
        read: ({ req }) => Boolean(req.user),
        create: convexCutoverLocked,
        update: convexCutoverLocked,
        delete: convexCutoverLocked,
    },
    hooks: {
        beforeChange: [rejectSecretWritesFromNonAdmins],
        beforeRead: [stripSecretsOnRead],
    },
    fields: toFieldConfigs(
        // ── Editable surface (mirrors shopBridge.fields) ──
        required(textField({ name: 'name' })),
        textareaField({ name: 'description' }),
        // `unique`/`index` are storage concerns the descriptor DSL does not model;
        // these stay raw so the domain constraints survive.
        { name: 'domain', type: 'text', required: true, unique: true, index: true },
        { name: 'alternativeDomains', type: 'text', hasMany: true, index: true },
        groupField({
            name: 'i18n',
            fields: [required(textField({ name: 'defaultLocale', defaultValue: 'en-US' }))],
        }),
        groupField({
            name: 'design',
            fields: [
                groupField({
                    name: 'header',
                    fields: [
                        groupField({
                            name: 'logo',
                            fields: [
                                required(textField({ name: 'src' })),
                                required(textField({ name: 'alt' })),
                                required(numberField({ name: 'width', defaultValue: 512 })),
                                required(numberField({ name: 'height', defaultValue: 512 })),
                            ],
                        }),
                    ],
                }),
                arrayField({
                    name: 'accents',
                    fields: [
                        required(
                            selectField({
                                name: 'type',
                                // Payload normalizes string options to `{ label, value }`
                                // with label === value; the explicit object form here is
                                // the descriptor-native equivalent of `['primary',
                                // 'secondary']`.
                                options: [
                                    { label: 'primary', value: 'primary' },
                                    { label: 'secondary', value: 'secondary' },
                                ],
                            }),
                        ),
                        required(textField({ name: 'color' })),
                        required(textField({ name: 'foreground' })),
                    ],
                }),
            ],
        }),

        // Optional per-tenant theme tokens (mirrors `ShopBase.theme` / `ResolvedShopTheme`). Every
        // field is optional; an unset theme resolves to the platform defaults via `resolveTheme`, so
        // leaving this blank renders byte-identically to today.
        {
            name: 'theme',
            type: 'group',
            fields: [
                {
                    name: 'colors',
                    type: 'group',
                    fields: [
                        { name: 'background', type: 'text' },
                        { name: 'foreground', type: 'text' },
                        {
                            name: 'accents',
                            type: 'array',
                            fields: [
                                { name: 'type', type: 'select', options: ['primary', 'secondary'], required: true },
                                { name: 'color', type: 'text', required: true },
                                { name: 'foreground', type: 'text', required: true },
                            ],
                        },
                        { name: 'accentPrimaryLight', type: 'text' },
                        { name: 'accentPrimaryDark', type: 'text' },
                        { name: 'accentSecondaryLight', type: 'text' },
                        { name: 'accentSecondaryDark', type: 'text' },
                        {
                            name: 'surface',
                            type: 'group',
                            fields: [
                                { name: 'base', type: 'text' },
                                { name: 'raised', type: 'text' },
                                { name: 'sunken', type: 'text' },
                            ],
                        },
                        {
                            name: 'text',
                            type: 'group',
                            fields: [
                                { name: 'default', type: 'text' },
                                { name: 'muted', type: 'text' },
                            ],
                        },
                        {
                            name: 'border',
                            type: 'group',
                            fields: [
                                { name: 'default', type: 'text' },
                                { name: 'strong', type: 'text' },
                            ],
                        },
                        {
                            name: 'state',
                            type: 'group',
                            fields: [
                                { name: 'sale', type: 'text' },
                                { name: 'danger', type: 'text' },
                                { name: 'success', type: 'text' },
                                { name: 'info', type: 'text' },
                            ],
                        },
                        { name: 'focusRing', type: 'text' },
                    ],
                },
                {
                    name: 'typography',
                    type: 'group',
                    fields: [
                        { name: 'fontFamily', type: 'select', options: FONT_FAMILY_OPTIONS },
                        { name: 'headingFamily', type: 'select', options: FONT_FAMILY_OPTIONS },
                        {
                            name: 'fontWeights',
                            type: 'group',
                            fields: [
                                { name: 'normal', type: 'number' },
                                { name: 'medium', type: 'number' },
                                { name: 'semibold', type: 'number' },
                                { name: 'bold', type: 'number' },
                            ],
                        },
                        {
                            name: 'scale',
                            type: 'group',
                            fields: [
                                { name: 'xs', type: 'text' },
                                { name: 'sm', type: 'text' },
                                { name: 'base', type: 'text' },
                                { name: 'lg', type: 'text' },
                                { name: 'xl', type: 'text' },
                            ],
                        },
                    ],
                },
                {
                    name: 'radii',
                    type: 'group',
                    fields: [
                        { name: 'block', type: 'text' },
                        { name: 'blockLarge', type: 'text' },
                        { name: 'blockSmall', type: 'text' },
                        { name: 'blockTiny', type: 'text' },
                    ],
                },
                {
                    name: 'spacing',
                    type: 'group',
                    fields: [
                        { name: 'blockPadding', type: 'text' },
                        { name: 'blockSpacer', type: 'text' },
                    ],
                },
                {
                    name: 'elevation',
                    type: 'group',
                    fields: [
                        { name: 'card', type: 'text' },
                        { name: 'cardHover', type: 'text' },
                        { name: 'panel', type: 'text' },
                    ],
                },
                {
                    // Flat per-knob map mirroring `--product-card-*` (and `--aspect-product-card-*`).
                    // Advanced surface — wrapped in a collapsible so this ~90-knob section starts
                    // collapsed and keeps the editor approachable. A named `group` cannot collapse
                    // itself (`initCollapsed` is a collapsible/array/blocks option only); the nested
                    // `productCard` group preserves the persisted data path 1:1.
                    type: 'collapsible',
                    label: 'Product card',
                    admin: { initCollapsed: true },
                    fields: [
                        {
                            name: 'productCard',
                            type: 'group',
                            fields: [
                                { name: 'bg', type: 'text' },
                                { name: 'borderColor', type: 'text' },
                                { name: 'borderWidth', type: 'text' },
                                { name: 'radius', type: 'text' },
                                { name: 'padding', type: 'text' },
                                { name: 'gap', type: 'text' },
                                { name: 'shadow', type: 'text' },
                                { name: 'shadowHover', type: 'text' },
                                { name: 'minWidth', type: 'text' },
                                { name: 'maxWidth', type: 'text' },
                                { name: 'gridAlign', type: 'text' },
                                { name: 'searchImageWidth', type: 'text' },
                                { name: 'imageRadius', type: 'text' },
                                { name: 'imagePadding', type: 'text' },
                                { name: 'imageFit', type: 'text' },
                                { name: 'imageHoverSwap', type: 'text' },
                                { name: 'imageSizes', type: 'text' },
                                { name: 'aspectVertical', type: 'text' },
                                { name: 'aspectHorizontal', type: 'text' },
                                { name: 'aspectHorizontalSquare', type: 'text' },
                                { name: 'aspectMicro', type: 'text' },
                                { name: 'vendorColor', type: 'text' },
                                { name: 'vendorSize', type: 'text' },
                                { name: 'titleColor', type: 'text' },
                                { name: 'titleSize', type: 'text' },
                                { name: 'titleWeight', type: 'number' },
                                { name: 'titleLineClamp', type: 'number' },
                                { name: 'priceColor', type: 'text' },
                                { name: 'priceSize', type: 'text' },
                                { name: 'priceWeight', type: 'number' },
                                { name: 'compareColor', type: 'text' },
                                { name: 'urgencyColor', type: 'text' },
                                { name: 'urgencyThreshold', type: 'number' },
                                { name: 'eyebrowTracking', type: 'text' },
                                { name: 'swatchSize', type: 'text' },
                                { name: 'swatchGap', type: 'text' },
                                { name: 'swatchRingColor', type: 'text' },
                                { name: 'swatchHitPadding', type: 'text' },
                                { name: 'chipBg', type: 'text' },
                                { name: 'chipColor', type: 'text' },
                                { name: 'chipBorder', type: 'text' },
                                { name: 'chipActiveBg', type: 'text' },
                                { name: 'chipActiveColor', type: 'text' },
                                { name: 'chipPaddingY', type: 'text' },
                                { name: 'chipPaddingX', type: 'text' },
                                { name: 'moreBg', type: 'text' },
                                { name: 'moreColor', type: 'text' },
                                { name: 'moreSize', type: 'text' },
                                { name: 'moreWeight', type: 'number' },
                                { name: 'moreMinSize', type: 'text' },
                                { name: 'ctaBg', type: 'text' },
                                { name: 'ctaColor', type: 'text' },
                                { name: 'ctaRadius', type: 'text' },
                                { name: 'ctaPaddingY', type: 'text' },
                                { name: 'ctaHeight', type: 'text' },
                                { name: 'ctaPlacement', type: 'text' },
                                { name: 'ctaPillPosition', type: 'text' },
                                { name: 'ctaPillLabel', type: 'text' },
                                { name: 'ctaPillIcon', type: 'text' },
                                { name: 'ctaPillReveal', type: 'text' },
                                { name: 'ctaInlineStyle', type: 'text' },
                                { name: 'fastPathDot', type: 'text' },
                                { name: 'fastPathSingleVariant', type: 'text' },
                                { name: 'quickAddPresentation', type: 'text' },
                                { name: 'overlayBg', type: 'text' },
                                { name: 'overlayRadius', type: 'text' },
                                { name: 'overlayBorderColor', type: 'text' },
                                { name: 'overlayShadow', type: 'text' },
                                { name: 'overlayWidth', type: 'text' },
                                { name: 'overlayMaxHeight', type: 'text' },
                                { name: 'overlayPadding', type: 'text' },
                                { name: 'oosOpacity', type: 'number' },
                                { name: 'oosImageSaturate', type: 'number' },
                                { name: 'motionEase', type: 'text' },
                                { name: 'motionFast', type: 'text' },
                                { name: 'motionBase', type: 'text' },
                                { name: 'motionPickerIn', type: 'text' },
                                { name: 'motionPickerOut', type: 'text' },
                                { name: 'motionHoverDuration', type: 'text' },
                                { name: 'motionHoverEase', type: 'text' },
                                { name: 'motionImageSwapDuration', type: 'text' },
                                { name: 'motionOverlayInDuration', type: 'text' },
                                { name: 'motionOverlayInEase', type: 'text' },
                                { name: 'saleStyle', type: 'text' },
                                { name: 'saleStrikeColor', type: 'text' },
                                { name: 'saleStrikeAngle', type: 'text' },
                                { name: 'saleStrikeExtend', type: 'text' },
                                { name: 'saleCurrentColor', type: 'text' },
                                { name: 'saleShowSavingsLine', type: 'text' },
                                { name: 'saleBadgeStyle', type: 'text' },
                                { name: 'saleBadgePosition', type: 'text' },
                                { name: 'saleBadgeText', type: 'text' },
                                { name: 'saleBadgeMinDiscount', type: 'number' },
                                { name: 'saleBadgeAllowOverlap', type: 'checkbox' },
                            ],
                        },
                    ],
                },
            ],
        },

        // ── Read-only / admin-managed surface (hidden in admin UI) ──

        {
            name: 'commerce',
            type: 'group',
            admin: { hidden: true },
            fields: [
                { name: 'maxQuantity', type: 'number', defaultValue: 199999 },
                { name: 'processingTimeInDays', type: 'number', defaultValue: 5 },
            ],
        },

        {
            name: 'icons',
            type: 'group',
            admin: { hidden: true },
            fields: [
                {
                    name: 'favicon',
                    type: 'group',
                    fields: [
                        { name: 'width', type: 'number', defaultValue: 512 },
                        { name: 'height', type: 'number', defaultValue: 512 },
                        { name: 'src', type: 'text' },
                        { name: 'alt', type: 'text' },
                    ],
                },
            ],
        },

        {
            name: 'commerceProvider',
            type: 'group',
            admin: { hidden: true },
            fields: [
                {
                    name: 'type',
                    type: 'select',
                    options: ['shopify', 'stripe'],
                    required: true,
                    defaultValue: 'shopify',
                },
                // Shopify-specific top-level fields (absent on stripe variant)
                { name: 'storefrontId', type: 'text' },
                { name: 'domain', type: 'text' },
                { name: 'id', type: 'text' },
                {
                    name: 'authentication',
                    type: 'group',
                    fields: [
                        // Sensitive — guarded by rejectSecretWritesFromNonAdmins / stripSecretsOnRead
                        { name: 'token', type: 'text' },
                        { name: 'publicToken', type: 'text' },
                        // Shopify storefront domain (distinct from top-level domain)
                        { name: 'domain', type: 'text' },
                        {
                            name: 'customers',
                            type: 'group',
                            fields: [
                                { name: 'id', type: 'text' },
                                { name: 'clientId', type: 'text' },
                                // Sensitive — guarded by hooks
                                { name: 'clientSecret', type: 'text' },
                            ],
                        },
                    ],
                },
            ],
        },

        {
            // integrations.judgeme is the only known integration; use a typed
            // group for fidelity. Extend with additional sub-groups if new
            // integrations are added to the Mongoose schema.
            name: 'integrations',
            type: 'group',
            admin: { hidden: true },
            fields: [
                {
                    name: 'judgeme',
                    type: 'group',
                    fields: [{ name: 'publicToken', type: 'text' }],
                },
            ],
        },

        {
            // thirdParty has known keys (googleTagManager, intercom) but treat
            // as json to accommodate future additions without schema migration.
            name: 'thirdParty',
            type: 'json',
            admin: { hidden: true },
        },

        {
            name: 'featureFlags',
            type: 'array',
            admin: { hidden: true },
            fields: [
                {
                    // 'feature-flags' collection is registered in Task 4.
                    // The cast suppresses the unknown-slug error until that lands.
                    name: 'flag',
                    type: 'relationship',
                    relationTo: 'feature-flags' as never,
                },
            ],
        },

        {
            // collaborators.permissions is string[] in the Mongoose schema,
            // not a single-value role select. Use hasMany text to preserve
            // the array shape without constraining to a fixed enum.
            name: 'collaborators',
            type: 'array',
            admin: { hidden: true },
            fields: [
                { name: 'user', type: 'text' },
                { name: 'permissions', type: 'text', hasMany: true },
            ],
        },
    ),
};
