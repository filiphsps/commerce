import { Schema } from 'mongoose';

import { db } from '../db';

import type { BaseDocument } from '../db';
import type { UserBase } from '.';

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
            theme: {
                accent: 'primary' | 'secondary';
                variant: 'default' | 'dark' | 'light';
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
    contentProvider: {
        id: string;
    } & (
        | {
              type: 'prismic';
              authentication: {
                  token: string;
              };
          }
        | {
              type: 'shopify';
          }
    );
    collaborators: {
        user: UserBase;
        permissions: string[];
    }[];
}

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
                },
                theme: {
                    accent: {
                        type: Schema.Types.String,
                        enum: ['primary', 'secondary'],
                        required: true,
                        default: 'primary'
                    },
                    variant: {
                        type: Schema.Types.String,
                        enum: ['default', 'dark', 'light'],
                        required: true,
                        default: 'default'
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
            id: {
                type: Schema.Types.String,
                required: true
            },
            authentication: {
                token: {
                    type: Schema.Types.String,
                    required: true
                }
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
