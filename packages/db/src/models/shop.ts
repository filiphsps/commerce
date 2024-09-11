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

export const ContentProviders = ['prismic', 'shopify', 'builder.io'] as const;
export const CommerceProviders = ['shopify', 'stripe'] as const;

export interface ShopBase extends BaseDocument {
    name: string;
    description?: string;

    domain: string;
    alternativeDomains?: string[];

    i18n?: {
        defaultLocale: string;
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
              type: 'prismic';
              authentication: {
                  token: string;
              };
              repositoryName: string;
              repository: string;
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

    commerceProvider:
        | {
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
          }
        | {
              type: 'stripe';
              authentication: {};
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

    integrations?: {
        judgeme?: {
            publicToken: string;
        };
    };

    thirdParty?: {
        googleTagManager?: string;
        intercom?: string;
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
        description: {
            type: Schema.Types.String,
            required: false
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

        i18n: {
            type: {
                defaultLocale: {
                    type: Schema.Types.String,
                    required: true,
                    default: 'en-US'
                }
            },
            required: true,
            default: {
                defaultLocale: 'en-US'
            }
        },

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
                enum: ContentProviders,
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
                enum: CommerceProviders,
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
                },

                customers: {
                    type: {
                        id: {
                            type: Schema.Types.String,
                            required: true
                        },
                        clientId: {
                            type: Schema.Types.String,
                            required: true
                        },
                        clientSecret: {
                            type: Schema.Types.String,
                            required: true
                        }
                    },
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

        integrations: {
            type: {
                judgme: {
                    type: {
                        publicToken: {
                            type: Schema.Types.String,
                            required: true
                        }
                    },
                    required: false
                }
            },
            required: false
        },

        thirdParty: {
            googleTagManager: {
                type: Schema.Types.String,
                required: false
            },
            intercom: {
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
