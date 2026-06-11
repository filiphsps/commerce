// Leaf import — the package barrel pulls in mongoose/db guarded by `server-only`, which the
// plain-Node `payload generate:types` / `cms:gen` contexts cannot load.
import { type FeatureFlagKind, isSectionFlagKey, SECTION_FLAG_PREFIX } from '@nordcom/commerce-db/lib/feature-flag';
import type { CollectionConfig, TextFieldSingleValidation } from 'payload';
import { validations } from 'payload';
import { convexCutoverLocked } from '../access';
import { arrayField, jsonField, required, selectField, textareaField, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';

/**
 * Field-level validator for a feature flag `key`. Runs Payload's built-in text validation first
 * (preserving the `required` enforcement that a custom validator would otherwise replace), then —
 * only when the sibling `kind` is `section` — requires the key to carry the `section:` prefix so
 * section toggles cannot be stored under an un-namespaced key.
 *
 * @param value - The submitted `key` value.
 * @param options - Payload validate options; `siblingData.kind` selects the section-key rule.
 * @returns `true` when valid, otherwise a human-readable error message (Payload's validate contract).
 */
const validateKey: TextFieldSingleValidation = async (value, options) => {
    const base = await validations.text(value, options);
    if (base !== true) return base;

    // `siblingData` is typed `unknown` here; narrow to read the sibling `kind` select value.
    const kind = (options.siblingData as { kind?: FeatureFlagKind } | undefined)?.kind;
    if (kind === 'section' && !(typeof value === 'string' && isSectionFlagKey(value))) {
        return `Section flags require a "${SECTION_FLAG_PREFIX}"-prefixed key (e.g. "${SECTION_FLAG_PREFIX}hero").`;
    }

    return true;
};

/**
 * Payload collection config for `feature-flags`. Stores platform-wide feature
 * toggles with default values, allowed options, and per-rule targeting overrides.
 * Readable by any authenticated user.
 *
 * CUTOVER-06: flag data lives on the core Convex `featureFlags` +
 * `shopFeatureFlags` tables behind the `db/feature_flags` seam; authoring is
 * operator tooling (Convex dashboard / seeds) until a dedicated admin surface
 * lands. Every Payload write operation is `convexCutoverLocked`; reads stay
 * authed-only until TEARDOWN-02 removes the collection.
 */
export const featureFlags: CollectionConfig = {
    slug: 'feature-flags',
    admin: { useAsTitle: 'key', defaultColumns: ['key', 'kind', 'description', 'updatedAt'], hidden: true },
    access: {
        read: ({ req }) => Boolean(req.user),
        create: convexCutoverLocked,
        update: convexCutoverLocked,
        delete: convexCutoverLocked,
    },
    fields: toFieldConfigs(
        // `validate`/`unique`/`index` have no descriptor equivalent; raw field
        // via the bridge so the section-key validator stays attached.
        { name: 'key', type: 'text', required: true, unique: true, index: true, validate: validateKey },
        selectField({
            name: 'kind',
            options: [
                { label: 'Behavior', value: 'behavior' },
                { label: 'Section', value: 'section' },
            ],
        }),
        textareaField({ name: 'description' }),
        required(jsonField({ name: 'defaultValue' })),
        arrayField({
            name: 'options',
            fields: [required(textField({ name: 'label' })), required(jsonField({ name: 'value' }))],
        }),
        // `targeting.params` carries a JSON `defaultValue`, which the JSON
        // descriptor does not model; the whole array is kept raw to preserve it.
        {
            name: 'targeting',
            type: 'array',
            fields: [
                { name: 'rule', type: 'text', required: true },
                { name: 'params', type: 'json', required: true, defaultValue: {} },
                { name: 'value', type: 'json', required: true },
                { name: 'description', type: 'text' },
            ],
        },
    ),
};
