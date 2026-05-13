import type { Block } from 'payload';
import { alertBlock } from './alert';
import { bannerBlock } from './banner';
import { collectionBlock } from './collection';
import { buildColumnsBlock } from './columns';
import { htmlBlock } from './html';
import { mediaGridBlock } from './media-grid';
import { overviewBlock } from './overview';
import { richTextBlock } from './rich-text';
import { vendorsBlock } from './vendors';

const leafBlocks: Block[] = [
    alertBlock,
    bannerBlock,
    collectionBlock,
    htmlBlock,
    mediaGridBlock,
    overviewBlock,
    richTextBlock,
    vendorsBlock,
];

export const allBlocks: Block[] = [buildColumnsBlock(leafBlocks), ...leafBlocks];
export const blockSlugs: string[] = allBlocks.map((b) => b.slug);

export {
    alertBlock,
    bannerBlock,
    collectionBlock,
    htmlBlock,
    mediaGridBlock,
    overviewBlock,
    richTextBlock,
    vendorsBlock,
};
