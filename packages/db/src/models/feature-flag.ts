import type { BaseDocument } from '../db';
// Pure section-flag primitives live in the Mongoose-free leaf module so the CMS collection config
// (a plain-Node `payload generate:types` context) can import them without pulling in `db.ts`'s
// `server-only`; the package barrel re-exports them, so `@nordcom/commerce-db` consumers are unchanged.
import type { FeatureFlagKind } from '../lib/feature-flag';

/**
 * JSON-serializable value accepted as a feature flag `defaultValue`, targeting rule output, or
 * option value. All flag storage uses this union — the Convex `featureFlags` table validates it
 * structurally (the migrated form of Mongo's `Mixed`).
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

/**
 * Resolved document shape for a feature flag record. Combines `BaseDocument` (id, timestamps) with
 * the flag fields — a unique `key`, the optional `kind` discriminator and `description`, the
 * required `defaultValue`, the optional enum-style `options`, and the `targeting` rule list. Use
 * this type when reading flag documents from `FeatureFlagService`.
 *
 * @example
 * ```ts
 * import type { FeatureFlagBase } from '@nordcom/commerce-db';
 * function isEnabled(flag: FeatureFlagBase): boolean {
 *     return flag.defaultValue === true;
 * }
 * ```
 */
export type FeatureFlagBase = BaseDocument & {
    key: string;
    // Optional discriminator (`behavior` | `section`); existing rows and new behavior flags persist
    // no value rather than a migrated default.
    kind?: FeatureFlagKind;
    description?: string;
    defaultValue: JsonValue;
    options?: FeatureFlagOption[];
    targeting: TargetingRule[];
};
