import type { Block } from 'payload';
import { selectField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';

const COLUMNS_BLOCK_SLUG = 'columns';

/**
 * Build a columns block whose nested `content` field accepts any block from
 * `siblings` except the columns block itself (prevents infinite nesting).
 *
 * @param siblings - All sibling block definitions in the parent `blocks` field.
 * @returns A Payload block definition for a 1–4 column layout.
 */
const buildColumnsBlock = (siblings: Block[]): Block => ({
    slug: COLUMNS_BLOCK_SLUG,
    interfaceName: 'ColumnsBlock',
    fields: [
        // The `columns` row carries `minRows`/`maxRows` array bounds the DSL does
        // not model, and its `content` embeds the sibling Payload block configs —
        // which carry the `interfaceName` and runtime field shapes the descriptor
        // `blocks` kind omits. So the array wrapper and `content` stay raw,
        // exactly as the collections' `blocks` field, while the row's `width`
        // choice goes through the descriptor bridge. Filtering out the columns
        // block itself prevents infinite nesting.
        {
            name: 'columns',
            type: 'array',
            minRows: 1,
            maxRows: 4,
            fields: toFieldConfigs(
                selectField({
                    name: 'width',
                    defaultValue: 'auto',
                    options: [
                        { label: 'Auto', value: 'auto' },
                        { label: 'One-third', value: '1/3' },
                        { label: 'One-half', value: '1/2' },
                        { label: 'Two-thirds', value: '2/3' },
                        { label: 'Full', value: 'full' },
                    ],
                }),
                {
                    name: 'content',
                    type: 'blocks',
                    blocks: siblings.filter((b) => b.slug !== COLUMNS_BLOCK_SLUG),
                },
            ),
        },
    ],
});

/**
 * Default columns block with an empty sibling list. Used in the `allBlocks`
 * registry; the `content` array accepts every other block once the registry
 * is assembled via `buildColumnsBlock(allBlocks)`.
 */
export const columnsBlock: Block = buildColumnsBlock([]);
export { buildColumnsBlock, COLUMNS_BLOCK_SLUG };
