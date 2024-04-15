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
            theme: {
                accent: 'primary' | 'secondary';
                variant: 'default' | 'dark' | 'light';
            };
        };
        accents: {
            color: string;
            foreground: string;
        }[];
    };
    icons?: {
        favicon?: {
            width: number;
            height: number;
            src: string;
        };
    };
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
                        color: {
                            type: Schema.Types.String
                        },
                        foreground: {
                            type: Schema.Types.String
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
