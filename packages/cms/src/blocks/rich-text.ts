import type { Block } from 'payload';
import { checkboxField, condition, jsonField, localized, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';

/**
 * Payload block definition for a localized rich-text body. Optionally collapsible with a custom label
 * for accordion-style presentation.
 *
 * The body is modeled as a localized `json` field: rich text is authored with ProseMirror/Tiptap
 * (CMSRICH-01) and stored as ProseMirror JSON, so the block no longer pulls in the dropped Payload
 * rich-text editor dependency. The native editor's rich-text widget renders this descriptor
 * (`json`) and binds it to the prosemirror-sync document backing its localized bucket.
 *
 * @example
 *   blocks: [richTextBlock]
 */
export const richTextBlock: Block = {
    slug: 'rich-text',
    interfaceName: 'RichTextBlock',
    fields: toFieldConfigs(
        localized(jsonField({ name: 'body' })),
        checkboxField({ name: 'collapsible', defaultValue: false }),
        condition(
            checkboxField({ name: 'collapsedByDefault', defaultValue: false }),
            (_data, sibling) => sibling.collapsible === true,
        ),
        condition(localized(textField({ name: 'collapseLabel' })), (_data, sibling) => sibling.collapsible === true),
    ),
};
