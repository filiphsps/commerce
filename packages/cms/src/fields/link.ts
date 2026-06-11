import {
    checkboxField,
    condition,
    groupField,
    localized,
    relationshipField,
    selectField,
    textField,
} from '../descriptors';
import type { NamedGroupField } from './seo';

/**
 * Every link destination kind the {@link linkField} discriminator supports.
 *
 * @example
 * LINK_KINDS.includes('external'); // true
 */
export const LINK_KINDS = ['page', 'article', 'product', 'collection', 'external', 'anchor'] as const;

/**
 * Union of the link destination kinds derived from {@link LINK_KINDS}.
 *
 * @example
 * const kind: LinkKind = 'page';
 */
export type LinkKind = (typeof LINK_KINDS)[number];

/**
 * Discriminated union describing the value the {@link linkField} group emits,
 * keyed by {@link LinkKind}. Each variant exposes only the destination field
 * relevant to its kind: an internal relation, an external/anchor URL, plus the
 * shared presentational `label` and `openInNewTab`.
 *
 * Distinct from the resolved link shape used by the storefront renderers — this
 * is the editor-authored, pre-resolution form.
 *
 * @example
 * const ref: LinkRef = { kind: 'external', url: 'https://example.com' };
 */
export type LinkRef =
    | { kind: 'page'; page?: string; label?: string; openInNewTab?: boolean }
    | { kind: 'article'; article?: string; label?: string; openInNewTab?: boolean }
    | { kind: 'product'; product?: string; label?: string; openInNewTab?: boolean }
    | { kind: 'collection'; collectionRef?: string; label?: string; openInNewTab?: boolean }
    | { kind: 'external'; url?: string; label?: string; openInNewTab?: boolean }
    | { kind: 'anchor'; url?: string; label?: string; openInNewTab?: boolean };

/**
 * Configuration options for {@link linkField}.
 *
 * @example
 * linkField({ name: 'cta', label: 'CTA link', localized: true });
 */
export type LinkFieldOptions = {
    name: string;
    label?: string;
    /** When `true` (the default), the presentational `label` leaf is localized. */
    localized?: boolean;
};

/**
 * Builds a group field descriptor capturing a typed link: internal page,
 * article, product, collection, external URL, or anchor. A `kind` select drives
 * conditional visibility so only the relevant sub-field is shown in the editor.
 *
 * Localization is LEAF-LEVEL on the presentational `label` only (G4FIX-03): the
 * Mongo-era corpus never stored per-locale link groups (destinations are
 * locale-invariant), and whole-group localization was silently ignored by the
 * native editor, so the group itself is never localized — composite kinds
 * reject the flag outright.
 *
 * @param options - {@link LinkFieldOptions} controlling the field name, label, and label localization.
 * @returns A named group field descriptor.
 *
 * @example
 * linkField({ name: 'primaryCta', localized: true });
 */
export const linkField = ({ name, label, localized: localizeLabel = true }: LinkFieldOptions): NamedGroupField =>
    groupField({
        name,
        label,
        fields: [
            selectField({
                name: 'kind',
                defaultValue: 'page',
                options: LINK_KINDS.map((value) => ({ label: value, value })),
            }),
            condition(
                relationshipField({ name: 'page', relationTo: 'pages' }),
                (_data, sibling) => sibling.kind === 'page',
            ),
            condition(
                relationshipField({ name: 'article', relationTo: 'articles' }),
                (_data, sibling) => sibling.kind === 'article',
            ),
            condition(
                relationshipField({ name: 'product', relationTo: 'productMetadata' }),
                (_data, sibling) => sibling.kind === 'product',
            ),
            // `collection` is reserved by Mongoose (it's a getter on Model), so we
            // store the collection-link relation under `collectionRef`. The `kind`
            // discriminator stays 'collection' for editor familiarity.
            condition(
                relationshipField({ name: 'collectionRef', relationTo: 'collectionMetadata' }),
                (_data, sibling) => sibling.kind === 'collection',
            ),
            condition(
                textField({ name: 'url' }),
                (_data, sibling) => sibling.kind === 'external' || sibling.kind === 'anchor',
            ),
            // `label` is intentionally optional — storefront renderers (e.g.
            // `BannerBlock`) treat an empty link group as "no CTA" via
            // `resolveLinkRef`, so requiring the label would block saves on any
            // doc that just hasn't filled the CTA yet (header drafts, nav items
            // pending content). The validation belongs in the consuming render
            // path, not in the editor schema.
            localizeLabel ? localized(textField({ name: 'label' })) : textField({ name: 'label' }),
            checkboxField({ name: 'openInNewTab', defaultValue: false }),
        ],
    });
