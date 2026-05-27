import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { Block } from 'payload';

/**
 * Payload block definition for a localized Lexical rich-text body. Optionally
 * collapsible with a custom label for accordion-style presentation.
 *
 * @example
 *   blocks: [richTextBlock]
 */
export const richTextBlock: Block = {
    slug: 'rich-text',
    interfaceName: 'RichTextBlock',
    fields: [
        { name: 'body', type: 'richText', localized: true, editor: lexicalEditor({}) },
        { name: 'collapsible', type: 'checkbox', defaultValue: false },
        {
            name: 'collapsedByDefault',
            type: 'checkbox',
            defaultValue: false,
            admin: { condition: (_d, sib) => sib?.collapsible === true },
        },
        {
            name: 'collapseLabel',
            type: 'text',
            localized: true,
            admin: { condition: (_d, sib) => sib?.collapsible === true },
        },
    ],
};
