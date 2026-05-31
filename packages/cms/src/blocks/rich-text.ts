import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { Block } from 'payload';
import { checkboxField, condition, localized, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';

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
    fields: toFieldConfigs(
        // `richText`/Lexical has no descriptor equivalent yet; kept raw with its
        // `localized` flag intact so the localized-field set is preserved.
        { name: 'body', type: 'richText', localized: true, editor: lexicalEditor({}) },
        checkboxField({ name: 'collapsible', defaultValue: false }),
        condition(
            checkboxField({ name: 'collapsedByDefault', defaultValue: false }),
            (_data, sibling) => sibling.collapsible === true,
        ),
        condition(localized(textField({ name: 'collapseLabel' })), (_data, sibling) => sibling.collapsible === true),
    ),
};
