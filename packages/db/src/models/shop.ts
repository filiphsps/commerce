import type { Document } from 'mongoose';
import { Schema } from 'mongoose';

import type { BaseDocument, DocumentExtras } from '../db';
import { db } from '../db';
import type { AccentToken, ShopThemeTokens } from '../lib/theme';
import type { FeatureFlagBase } from './feature-flag';
import type { UserBase } from './user';

// TODO: Remove this.
/**
 * Legacy header theme configuration superseded by the `design` property on `ShopBase`. Retained
 * until existing theme-reading callsites are migrated to `ShopBase.design`.
 *
 * @example
 * ```ts
 * import type { ShopTheme } from '@nordcom/commerce-db';
 * const theme: ShopTheme = { header: { theme: 'primary', themeVariant: 'default' } };
 * ```
 */
export type ShopTheme = {
    header: {
        theme: 'primary' | 'secondary';
        themeVariant: 'default' | 'light' | 'dark';
    };
};

/**
 * Auth and connection configuration for the Shopify commerce integration. Identifies the
 * storefront via `domain` and `storefrontId`, carries the Storefront API credentials, and
 * optionally includes the Customer Account API settings required for authenticated storefronts.
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
 * Embedded reference in a shop's `featureFlags` array. When loaded without population, `flag` is
 * a Mongoose `ObjectId`; after `Shop.findByDomain({ populate: ['featureFlags.flag'] })` it is the
 * full `FeatureFlagBase` document. Narrow with `typeof flag === 'object' && 'key' in flag`.
 *
 * @example
 * ```ts
 * import type { FeatureFlagRef } from '@nordcom/commerce-db';
 * function isFlagPopulated(ref: FeatureFlagRef): boolean {
 *     return typeof ref.flag === 'object' && 'key' in ref.flag;
 * }
 * ```
 */
// `flag` is stored as an ObjectId in MongoDB. After `populate('featureFlags.flag')`
// (see `Shop.findByDomain({ populate })`), the field is the full FeatureFlag
// document. Consumers receive whichever shape the query produced; runtime code
// should narrow with `typeof flag === 'object' && 'key' in flag`.
export interface FeatureFlagRef {
    flag: import('mongoose').Types.ObjectId | FeatureFlagBase;
}

/**
 * Raw document shape for a multi-tenant shop record as stored in MongoDB. Extends `BaseDocument`
 * with all tenant-specific configuration fields including domain routing, commerce provider
 * credentials, design tokens, and feature flags. Use `OnlineShop` for client-facing work since it
 * strips the Mongoose document overhead and masks credential fields.
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

    icons?: {
        favicon?: {
            width: number;
            height: number;
            src: string;
            alt: string;
        };
    };

    commerceProvider: CommerceProvider;

    collaborators: [
        {
            type: {
                user: UserBase;
                permissions: string[];
            };
            default: [];
        },
    ];

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
 * Client-safe shop shape derived from `ShopBase` with Mongoose document methods stripped.
 * Returned by all `ShopService` read methods; safe to pass to Client Components or server actions.
 * Credential fields (`authentication.token`, `customers.clientSecret`) are masked by
 * `docToOnlineShop` unless `sensitiveData: true` is passed to `ShopService.findByDomain`.
 *
 * @example
 * ```ts
 * import type { OnlineShop } from '@nordcom/commerce-db';
 * function shopDomain(shop: OnlineShop): string {
 *     return shop.domain;
 * }
 * ```
 */
export type OnlineShop = Omit<ShopBase, keyof Omit<Document, keyof DocumentExtras> | 'collaborators' | 'schema'> & {
    collaborators?: ShopBase['collaborators'];
};

export const ShopSchema = new Schema<ShopBase>(
    {
        name: {
            type: Schema.Types.String,
            required: true,
        },
        description: {
            type: Schema.Types.String,
            required: false,
        },

        domain: {
            type: Schema.Types.String,
            unique: true,
            required: true,
        },
        alternativeDomains: [
            {
                type: Schema.Types.String,
                default: [],
            },
        ],

        i18n: {
            type: {
                defaultLocale: {
                    type: Schema.Types.String,
                    required: true,
                    default: 'en-US',
                },
            },
            required: true,
            default: {
                defaultLocale: 'en-US',
            },
        },

        commerce: {
            type: {
                maxQuantity: {
                    type: Schema.Types.Number,
                    required: false,
                    default: 199_999,
                },
                processingTimeInDays: {
                    type: Schema.Types.Number,
                    required: false,
                    default: 5,
                },
            },
            required: false,
            default: {},
        },

        showProductVendor: {
            type: Schema.Types.Boolean,
            required: false,
            default: false,
        },

        design: {
            header: {
                logo: {
                    width: {
                        type: Schema.Types.Number,
                        required: true,
                        default: 512,
                    },
                    height: {
                        type: Schema.Types.Number,
                        required: true,
                        default: 512,
                    },
                    src: {
                        type: Schema.Types.String,
                        required: true,
                    },
                    alt: {
                        type: Schema.Types.String,
                        required: true,
                    },
                },
            },
            accents: {
                type: [
                    {
                        type: {
                            type: Schema.Types.String,
                            enum: ['primary', 'secondary'],
                            required: true,
                        },
                        color: {
                            type: Schema.Types.String,
                            required: true,
                        },
                        foreground: {
                            type: Schema.Types.String,
                            required: true,
                        },
                    },
                ],
                required: true,
                default: [],
            },
        },

        // Optional per-tenant theme overrides. Every leaf is optional with NO default and the group
        // itself is `required: false` with no default, so a shop that never sets a theme serializes
        // nothing here and resolves to the platform defaults via `resolveTheme` — byte-identical to
        // today, no migration. Field types mirror `ResolvedShopTheme` (String/Number/Boolean) so
        // Mongoose casts authored values; the camelCase keys map 1:1 to the storefront CSS vars.
        theme: {
            type: {
                colors: {
                    background: Schema.Types.String,
                    foreground: Schema.Types.String,
                    accents: {
                        type: [
                            {
                                type: {
                                    type: Schema.Types.String,
                                    enum: ['primary', 'secondary'],
                                    required: true,
                                },
                                color: { type: Schema.Types.String, required: true },
                                foreground: { type: Schema.Types.String, required: true },
                            },
                        ],
                        required: false,
                    },
                    accentPrimaryLight: Schema.Types.String,
                    accentPrimaryDark: Schema.Types.String,
                    accentSecondaryLight: Schema.Types.String,
                    accentSecondaryDark: Schema.Types.String,
                    surface: {
                        base: Schema.Types.String,
                        raised: Schema.Types.String,
                        sunken: Schema.Types.String,
                    },
                    text: {
                        default: Schema.Types.String,
                        muted: Schema.Types.String,
                    },
                    border: {
                        default: Schema.Types.String,
                        strong: Schema.Types.String,
                    },
                    state: {
                        sale: Schema.Types.String,
                        danger: Schema.Types.String,
                        success: Schema.Types.String,
                        info: Schema.Types.String,
                    },
                    focusRing: Schema.Types.String,
                },
                typography: {
                    fontFamily: Schema.Types.String,
                    headingFamily: Schema.Types.String,
                    fontWeights: {
                        normal: Schema.Types.Number,
                        medium: Schema.Types.Number,
                        semibold: Schema.Types.Number,
                        bold: Schema.Types.Number,
                    },
                    scale: {
                        xs: Schema.Types.String,
                        sm: Schema.Types.String,
                        base: Schema.Types.String,
                        lg: Schema.Types.String,
                        xl: Schema.Types.String,
                    },
                },
                radii: {
                    block: Schema.Types.String,
                    blockLarge: Schema.Types.String,
                    blockSmall: Schema.Types.String,
                    blockTiny: Schema.Types.String,
                },
                spacing: {
                    blockPadding: Schema.Types.String,
                    blockSpacer: Schema.Types.String,
                },
                elevation: {
                    card: Schema.Types.String,
                    cardHover: Schema.Types.String,
                    panel: Schema.Types.String,
                },
                productCard: {
                    bg: Schema.Types.String,
                    borderColor: Schema.Types.String,
                    borderWidth: Schema.Types.String,
                    radius: Schema.Types.String,
                    padding: Schema.Types.String,
                    gap: Schema.Types.String,
                    shadow: Schema.Types.String,
                    shadowHover: Schema.Types.String,
                    minWidth: Schema.Types.String,
                    maxWidth: Schema.Types.String,
                    gridAlign: Schema.Types.String,
                    searchImageWidth: Schema.Types.String,

                    imageRadius: Schema.Types.String,
                    imagePadding: Schema.Types.String,
                    imageFit: Schema.Types.String,
                    imageHoverSwap: Schema.Types.String,
                    imageSizes: Schema.Types.String,
                    aspectVertical: Schema.Types.String,
                    aspectHorizontal: Schema.Types.String,
                    aspectHorizontalSquare: Schema.Types.String,
                    aspectMicro: Schema.Types.String,

                    vendorColor: Schema.Types.String,
                    vendorSize: Schema.Types.String,
                    titleColor: Schema.Types.String,
                    titleSize: Schema.Types.String,
                    titleWeight: Schema.Types.Number,
                    titleLineClamp: Schema.Types.Number,
                    priceColor: Schema.Types.String,
                    priceSize: Schema.Types.String,
                    priceWeight: Schema.Types.Number,
                    compareColor: Schema.Types.String,
                    urgencyColor: Schema.Types.String,
                    urgencyThreshold: Schema.Types.Number,
                    eyebrowTracking: Schema.Types.String,

                    swatchSize: Schema.Types.String,
                    swatchGap: Schema.Types.String,
                    swatchRingColor: Schema.Types.String,
                    swatchHitPadding: Schema.Types.String,

                    chipBg: Schema.Types.String,
                    chipColor: Schema.Types.String,
                    chipBorder: Schema.Types.String,
                    chipActiveBg: Schema.Types.String,
                    chipActiveColor: Schema.Types.String,
                    chipPaddingY: Schema.Types.String,
                    chipPaddingX: Schema.Types.String,
                    moreBg: Schema.Types.String,
                    moreColor: Schema.Types.String,
                    moreSize: Schema.Types.String,
                    moreWeight: Schema.Types.Number,
                    moreMinSize: Schema.Types.String,

                    ctaBg: Schema.Types.String,
                    ctaColor: Schema.Types.String,
                    ctaRadius: Schema.Types.String,
                    ctaPaddingY: Schema.Types.String,
                    ctaHeight: Schema.Types.String,
                    ctaPlacement: Schema.Types.String,
                    ctaPillPosition: Schema.Types.String,
                    ctaPillLabel: Schema.Types.String,
                    ctaPillIcon: Schema.Types.String,
                    ctaPillReveal: Schema.Types.String,
                    ctaInlineStyle: Schema.Types.String,
                    fastPathDot: Schema.Types.String,
                    fastPathSingleVariant: Schema.Types.String,
                    quickAddPresentation: Schema.Types.String,

                    overlayBg: Schema.Types.String,
                    overlayRadius: Schema.Types.String,
                    overlayBorderColor: Schema.Types.String,
                    overlayShadow: Schema.Types.String,
                    overlayWidth: Schema.Types.String,
                    overlayMaxHeight: Schema.Types.String,
                    overlayPadding: Schema.Types.String,

                    oosOpacity: Schema.Types.Number,
                    oosImageSaturate: Schema.Types.Number,

                    motionEase: Schema.Types.String,
                    motionFast: Schema.Types.String,
                    motionBase: Schema.Types.String,
                    motionPickerIn: Schema.Types.String,
                    motionPickerOut: Schema.Types.String,
                    motionHoverDuration: Schema.Types.String,
                    motionHoverEase: Schema.Types.String,
                    motionImageSwapDuration: Schema.Types.String,
                    motionOverlayInDuration: Schema.Types.String,
                    motionOverlayInEase: Schema.Types.String,

                    saleStyle: Schema.Types.String,
                    saleStrikeColor: Schema.Types.String,
                    saleStrikeAngle: Schema.Types.String,
                    saleStrikeExtend: Schema.Types.String,
                    saleCurrentColor: Schema.Types.String,
                    saleShowSavingsLine: Schema.Types.String,
                    saleBadgeStyle: Schema.Types.String,
                    saleBadgePosition: Schema.Types.String,
                    saleBadgeText: Schema.Types.String,
                    saleBadgeMinDiscount: Schema.Types.Number,
                    saleBadgeAllowOverlap: Schema.Types.Boolean,
                },
            },
            required: false,
        },

        icons: {
            favicon: {
                width: {
                    type: Schema.Types.Number,
                    required: true,
                    default: 512,
                },
                height: {
                    type: Schema.Types.Number,
                    required: true,
                    default: 512,
                },
                src: {
                    type: Schema.Types.String,
                    required: true,
                },
                alt: {
                    type: Schema.Types.String,
                    required: true,
                },
            },
        },

        commerceProvider: {
            type: {
                type: Schema.Types.String,
                enum: CommerceProviders,
                required: true,
                default: 'shopify',
            },
            authentication: {
                token: {
                    type: Schema.Types.String,
                    required: false,
                },
                publicToken: {
                    type: Schema.Types.String,
                    required: false,
                },

                customers: {
                    type: {
                        id: {
                            type: Schema.Types.String,
                            required: true,
                        },
                        clientId: {
                            type: Schema.Types.String,
                            required: true,
                        },
                        clientSecret: {
                            type: Schema.Types.String,
                            required: true,
                        },
                    },
                    required: false,
                },
            },
            id: {
                type: Schema.Types.String,
                required: false,
            },
            storefrontId: {
                type: Schema.Types.String,
                required: false,
            },
            domain: {
                type: Schema.Types.String,
                required: false,
            },
        },

        collaborators: {
            type: [
                {
                    user: {
                        type: Schema.Types.ObjectId,
                        ref: 'User',
                    },
                    permissions: [
                        {
                            type: Schema.Types.String,
                            default: [],
                        },
                    ],
                },
            ],
            required: true,
            default: [],
        },

        integrations: {
            type: {
                judgeme: {
                    type: {
                        publicToken: {
                            type: Schema.Types.String,
                            required: true,
                        },
                    },
                    required: false,
                },
            },
            required: false,
        },

        thirdParty: {
            googleTagManager: {
                type: Schema.Types.String,
                required: false,
            },
            intercom: {
                type: Schema.Types.String,
                required: false,
            },
        },

        featureFlags: {
            type: [
                {
                    flag: {
                        type: Schema.Types.ObjectId,
                        ref: 'FeatureFlag',
                        required: true,
                    },
                },
            ],
            required: false,
            default: [],
        },
    },
    {
        id: true,
        timestamps: true,
    },
);

// `findByDomain` resolves a tenant via `$or: [{ domain }, { alternativeDomains: domain }]` on
// every request. `domain` is covered by its `unique` index, but the array branch was unindexed,
// so the `$or` degraded to a full `shops` collection scan that worsens with tenant count.
ShopSchema.index({ alternativeDomains: 1 });

export const ShopModel = (db.models.Shop || db.model('Shop', ShopSchema)) as ReturnType<
    typeof db.model<typeof ShopSchema>
>;
