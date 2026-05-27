import type { InferSchemaType } from 'mongoose';
import { Schema } from 'mongoose';

import type { BaseDocument } from '../db';
import { db } from '../db';

/**
 * JSON-serializable value accepted as a feature flag `defaultValue`, targeting rule output, or
 * option value. All flag storage uses this union to stay compatible with Mongo's `Mixed` type.
 *
 * @example
 * ```ts
 * import type { JsonValue } from '@nordcom/commerce-db';
 * const defaultValue: JsonValue = false;
 * ```
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * One selectable option in a feature flag's `options` list. Pairs a human-readable label with a
 * JSON-safe value to support enum-style flags in the admin UI.
 *
 * @example
 * ```ts
 * import type { FeatureFlagOption } from '@nordcom/commerce-db';
 * const opt: FeatureFlagOption = { label: 'Blue', value: 'blue' };
 * ```
 */
export interface FeatureFlagOption {
    label: string;
    value: JsonValue;
}

/**
 * One rule in a feature flag's targeting configuration. `rule` names the evaluator registered in
 * the platform, `params` supplies its inputs, and `value` is the override returned when the rule
 * matches the requesting context.
 *
 * @example
 * ```ts
 * import type { TargetingRule } from '@nordcom/commerce-db';
 * const rule: TargetingRule = { rule: 'shopDomain', params: { domain: 'acme.com' }, value: true };
 * ```
 */
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

/**
 * Resolved document shape for a feature flag record. Combines `BaseDocument` (id, timestamps) with
 * the schema fields, replacing inferred sub-document types with the explicit `TargetingRule` and
 * `FeatureFlagOption` shapes. Use this type when reading flag documents from `FeatureFlagService`.
 *
 * @example
 * ```ts
 * import type { FeatureFlagBase } from '@nordcom/commerce-db';
 * function isEnabled(flag: FeatureFlagBase): boolean {
 *     return flag.defaultValue === true;
 * }
 * ```
 */
export type FeatureFlagBase = BaseDocument &
    Omit<InferredFeatureFlag, 'targeting' | 'options'> & {
        targeting: TargetingRule[];
        options?: FeatureFlagOption[];
    };

export const FeatureFlagModel = (db.models.FeatureFlag || db.model('FeatureFlag', FeatureFlagSchema)) as ReturnType<
    typeof db.model<typeof FeatureFlagSchema>
>;
