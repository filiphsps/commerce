import { Schema } from 'mongoose';

import { db } from '../db';

import type { BaseDocument, DocumentExtras } from '../db';
import type { UserBase } from '.';
import type { Document } from 'mongoose';

// TODO: Remove this.
export type ShopTheme = {
    header: {
        theme: 'primary' | 'secondary';
        themeVariant: 'default' | 'light' | 'dark';
    };
};

export interface ShopBase extends BaseDocument {
    name: string;
    domain: string;
    alternativeDomains?: string[];
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
              type: 'prismic';
              authentication: {
                  token: string;
              };
              repositoryName: string;
              repository: string;
          }
        | {
              type: 'shopify';
          };
    commerceProvider: {
        type: 'shopify';
        authentication: {
            token: string;
            publicToken: string;
        };
        storefrontId: string;
        domain: string;
        id: string;
    };

    integrations: {
        okendo?: {
            subscriberId: string;
        };
    };

    collaborators: [
        {
            type: {
                user: UserBase;
                permissions: string[];
            };
            default: [];
        }
    ];

    thirdParty?: {
        googleTagManager?: string;
    };
}

export type OnlineShop = Omit<ShopBase, keyof Omit<Document, keyof DocumentExtras> | 'collaborators' | 'schema'> & {
    collaborators?: ShopBase['collaborators'];
};

export const ShopSchema = new Schema<ShopBase>(
    {
        name: {
            type: Schema.Types.String,
            required: true
        },

        domain: {
            type: Schema.Types.String,
            unique: true,
            required: true
        },
        alternativeDomains: [
            {
                type: Schema.Types.String,
                default: []
            }
        ],

        design: {
            header: {
                logo: {
                    width: {
                        type: Schema.Types.Number,
                        required: true,
                        default: 512
                    },
                    height: {
                        type: Schema.Types.Number,
                        required: true,
                        default: 512
                    },
                    src: {
                        type: Schema.Types.String,
                        required: true
                    },
                    alt: {
                        type: Schema.Types.String,
                        required: true
                    }
                }
            },
            accents: {
                type: [
                    {
                        type: {
                            type: Schema.Types.String,
                            enum: ['primary', 'secondary'],
                            required: true
                        },
                        color: {
                            type: Schema.Types.String,
                            required: true
                        },
                        foreground: {
                            type: Schema.Types.String,
                            required: true
                        }
                    }
                ],
                required: true,
                default: []
            }
        },

        icons: {
            favicon: {
                width: {
                    type: Schema.Types.Number,
                    required: true,
                    default: 512
                },
                height: {
                    type: Schema.Types.Number,
                    required: true,
                    default: 512
                },
                src: {
                    type: Schema.Types.String,
                    required: true
                },
                alt: {
                    type: Schema.Types.String,
                    required: true
                }
            }
        },

        contentProvider: {
            type: {
                type: Schema.Types.String,
                enum: ['prismic', 'shopify'],
                required: true,
                default: 'prismic'
            },
            authentication: {
                token: {
                    type: Schema.Types.String,
                    required: false
                }
            },
            repositoryName: {
                type: Schema.Types.String,
                required: false
            },
            repository: {
                type: Schema.Types.String,
                required: false
            }
        },
        commerceProvider: {
            type: {
                type: Schema.Types.String,
                enum: ['shopify'],
                required: true,
                default: 'shopify'
            },
            authentication: {
                token: {
                    type: Schema.Types.String,
                    required: false
                },
                publicToken: {
                    type: Schema.Types.String,
                    required: false
                }
            },
            id: {
                type: Schema.Types.String,
                required: false
            },
            storefrontId: {
                type: Schema.Types.String,
                required: false
            },
            domain: {
                type: Schema.Types.String,
                required: false
            }
        },

        integrations: {
            okendo: {
                type: {
                    subscriberId: {
                        type: Schema.Types.String,
                        required: true
                    }
                },
                required: false
            }
        },

        collaborators: {
            type: [
                {
                    user: {
                        type: Schema.Types.ObjectId,
                        ref: 'User'
                    },
                    permissions: [
                        {
                            type: Schema.Types.String,
                            default: []
                        }
                    ]
                }
            ],
            required: true,
            default: []
        },

        thirdParty: {
            googleTagManager: {
                type: Schema.Types.String,
                required: false
            }
        }
    },
    {
        id: true,
        timestamps: true,
        versionKey: false
    }
);

export const ShopModel = (db.models.Shop || db.model('Shop', ShopSchema)) as ReturnType<
    typeof db.model<typeof ShopSchema>
>;
