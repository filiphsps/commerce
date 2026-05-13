import type { NamedGroupField } from './seo';

export type LinkFieldOptions = {
    name: string;
    label?: string;
    localized?: boolean;
};

export const linkField = ({ name, label, localized = true }: LinkFieldOptions): NamedGroupField => ({
    name,
    type: 'group',
    label,
    localized,
    fields: [
        {
            name: 'kind',
            type: 'select',
            defaultValue: 'internal',
            options: [
                { label: 'Internal page', value: 'page' },
                { label: 'Article', value: 'article' },
                { label: 'Product', value: 'product' },
                { label: 'Collection', value: 'collection' },
                { label: 'External URL', value: 'external' },
                { label: 'Anchor', value: 'anchor' },
            ],
            required: true,
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
        { name: 'label', type: 'text', required: true },
        { name: 'openInNewTab', type: 'checkbox', defaultValue: false },
    ],
});
