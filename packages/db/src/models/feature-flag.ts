import type { InferSchemaType } from 'mongoose';
import { Schema } from 'mongoose';

import type { BaseDocument } from '../db';
import { db } from '../db';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface FeatureFlagOption {
    label: string;
    value: JsonValue;
}

export interface TargetingRule {
    rule: string;
    params: Record<string, JsonValue>;
    value: JsonValue;
    description?: string;
}

const TargetingRuleSchema = new Schema(
    {
        rule: { type: Schema.Types.String, required: true },
        params: { type: Schema.Types.Mixed, required: true, default: {} },
        value: { type: Schema.Types.Mixed, required: true },
        description: { type: Schema.Types.String, required: false },
    },
    { _id: false },
);

const FeatureFlagOptionSchema = new Schema(
    {
        label: { type: Schema.Types.String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
    },
    { _id: false },
);

export const FeatureFlagSchema = new Schema(
    {
        key: { type: Schema.Types.String, required: true },
        description: { type: Schema.Types.String, required: false },
        defaultValue: { type: Schema.Types.Mixed, required: true },
        options: { type: [FeatureFlagOptionSchema], required: false, default: undefined },
        targeting: { type: [TargetingRuleSchema], required: true, default: [] },
    },
    { id: true, timestamps: true },
);

FeatureFlagSchema.index({ key: 1 }, { unique: true });

type InferredFeatureFlag = InferSchemaType<typeof FeatureFlagSchema>;

export type FeatureFlagBase = BaseDocument &
    Omit<InferredFeatureFlag, 'targeting' | 'options'> & {
        targeting: TargetingRule[];
        options?: FeatureFlagOption[];
    };

export const FeatureFlagModel = (db.models.FeatureFlag || db.model('FeatureFlag', FeatureFlagSchema)) as ReturnType<
    typeof db.model<typeof FeatureFlagSchema>
>;
