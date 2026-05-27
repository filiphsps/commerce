import type { NamedGroupField } from './seo';

/**
 * Configuration options for {@link linkField}.
 *
 * @example
 * linkField({ name: 'cta', label: 'CTA link', localized: true });
 */
export type LinkFieldOptions = {
    name: string;
    label?: string;
    localized?: boolean;
};

/**
 * Builds a Payload group field capturing a typed link: internal page, article,
 * product, collection, external URL, or anchor. A `kind` select drives
 * conditional visibility so only the relevant sub-field is shown in the editor.
 *
 * @param options - {@link LinkFieldOptions} controlling the field name, label, and localization.
 * @returns A named Payload group field config.
 *
 * @example
 * linkField({ name: 'primaryCta', localized: true });
 */
export const linkField = ({ name, label, localized = true }: LinkFieldOptions): NamedGroupField => ({
    name,
    type: 'group',
    label,
    localized,
    fields: [
        {
            name: 'kind',
            type: 'select',
            defaultValue: 'page',
            options: [
                { label: 'Internal page', value: 'page' },
                { label: 'Article', value: 'article' },
                { label: 'Product', value: 'product' },
                { label: 'Collection', value: 'collection' },
                { label: 'External URL', value: 'external' },
                { label: 'Anchor', value: 'anchor' },
            ],
        },
        {
            name: 'page',
            type: 'relationship',
            relationTo: 'pages',
            admin: { condition: (_d, sib) => sib?.kind === 'page' },
        },
        {
            name: 'article',
            type: 'relationship',
            relationTo: 'articles',
            admin: { condition: (_d, sib) => sib?.kind === 'article' },
        },
        {
            name: 'product',
            type: 'relationship',
            relationTo: 'productMetadata',
            admin: { condition: (_d, sib) => sib?.kind === 'product' },
        },
        {
            // `collection` is reserved by Mongoose (it's a getter on Model), so we
            // store the collection-link relation under `collectionRef`. The `kind`
            // discriminator stays 'collection' for editor familiarity.
            name: 'collectionRef',
            type: 'relationship',
            relationTo: 'collectionMetadata',
            admin: { condition: (_d, sib) => sib?.kind === 'collection' },
        },
        {
            name: 'url',
            type: 'text',
            admin: { condition: (_d, sib) => sib?.kind === 'external' || sib?.kind === 'anchor' },
        },
        // `label` is intentionally optional — storefront renderers (e.g.
        // `BannerBlock`) treat an empty link group as "no CTA" via
        // `resolveLinkRef`, so requiring the label would block saves on any
        // doc that just hasn't filled the CTA yet (header drafts, nav items
        // pending content). The validation belongs in the consuming render
        // path, not in the editor schema.
        { name: 'label', type: 'text' },
        { name: 'openInNewTab', type: 'checkbox', defaultValue: false },
    ],
});
