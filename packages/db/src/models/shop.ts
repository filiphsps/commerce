import type { Document } from 'mongoose';
import { Schema } from 'mongoose';

import type { BaseDocument, DocumentExtras } from '../db';
import { db } from '../db';
import type { UserBase } from './user';

// TODO: Remove this.
export type ShopTheme = {
    header: {
        theme: 'primary' | 'secondary';
        themeVariant: 'default' | 'light' | 'dark';
    };
};

export type CMSContentProvider = {
    type: 'cms';
};
export type ShopifyContentProvider = {
    type: 'shopify';
};
export type ContentProvider = CMSContentProvider | ShopifyContentProvider;

// Value AND type sharing the same name: `enum: ContentProviders` in the schema
// (Mongoose's runtime validator) needs a runtime array; consumers that write
// `let p: ContentProviders` keep the union narrowing. The `satisfies` clause
// guarantees the array stays in sync with the discriminated-union members.
export const ContentProviders = ['cms', 'shopify'] as const satisfies ContentProvider['type'][];
export type ContentProviders = (typeof ContentProviders)[number];

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
export type StripeCommerceProvider = {
    type: 'stripe';
    authentication: {};
};
export type CommerceProvider = ShopifyCommerceProvider | StripeCommerceProvider;

// See `ContentProviders` for the value-and-type-share rationale.
export const CommerceProviders = ['shopify', 'stripe'] as const satisfies CommerceProvider['type'][];
export type CommerceProviders = (typeof CommerceProviders)[number];

export interface FeatureFlagRef {
    flag: import('mongoose').Types.ObjectId;
}

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

    design: {
        header: {
            logo: {
                width: number;
                height: number;
                src: string;
                alt: string;
            };
        };
        accents: {
            type: 'primary' | 'secondary';
            color: string;
            foreground: string;
        }[];
    };
    icons?: {
        favicon?: {
            width: number;
            height: number;
            src: string;
            alt: string;
        };
    };

    contentProvider:
        | {
              type: 'cms';
          }
        | {
              type: 'shopify';
          }
        | {
              type: 'builder.io';
              authentication: {
                  token: string;
                  publicToken: string;
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

        contentProvider: {
            type: {
                type: Schema.Types.String,
                enum: ContentProviders,
                required: true,
                default: 'cms',
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

export const ShopModel = (db.models.Shop || db.model('Shop', ShopSchema)) as ReturnType<
    typeof db.model<typeof ShopSchema>
>;
