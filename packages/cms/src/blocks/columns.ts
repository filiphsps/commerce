import type { Block } from 'payload';

const COLUMNS_BLOCK_SLUG = 'columns';

const buildColumnsBlock = (siblings: Block[]): Block => ({
    slug: COLUMNS_BLOCK_SLUG,
    interfaceName: 'ColumnsBlock',
    fields: [
        {
            name: 'columns',
            type: 'array',
            minRows: 1,
            maxRows: 4,
            fields: [
                {
                    name: 'width',
                    type: 'select',
                    defaultValue: 'auto',
                    options: [
                        { label: 'Auto', value: 'auto' },
                        { label: 'One-third', value: '1/3' },
                        { label: 'One-half', value: '1/2' },
                        { label: 'Two-thirds', value: '2/3' },
                        { label: 'Full', value: 'full' },
                    ],
                },
                {
                    name: 'content',
                    type: 'blocks',
                    blocks: siblings.filter((b) => b.slug !== COLUMNS_BLOCK_SLUG),
                },
            ],
        },
    ],
});

export const columnsBlock: Block = buildColumnsBlock([]);
export { buildColumnsBlock, COLUMNS_BLOCK_SLUG };
