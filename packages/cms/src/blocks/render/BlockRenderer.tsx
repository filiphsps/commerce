import type { ReactNode } from 'react';
import { AlertBlock } from './AlertBlock';
import { BannerBlock } from './BannerBlock';
import { HtmlBlock } from './HtmlBlock';
import { MediaGridBlock } from './MediaGridBlock';
import { RichTextBlock } from './RichTextBlock';
import type { BlockNode, BlockRenderContext } from './types';

const MAX_DEPTH = 6;

export function BlockRenderer({
    blocks,
    context,
}: {
    blocks: BlockNode[];
    context: BlockRenderContext;
}): ReactNode {
    const depth = context.depth ?? 0;
    if (depth >= MAX_DEPTH) return null;

    return (
        <>
            {blocks.map((block, idx) => {
                switch (block.blockType) {
                    case 'rich-text':
                        return <RichTextBlock key={idx} block={block} />;
                    case 'alert':
                        return <AlertBlock key={idx} block={block} />;
                    case 'html':
                        return <HtmlBlock key={idx} block={block} />;
                    case 'media-grid':
                        return <MediaGridBlock key={idx} block={block} />;
                    case 'banner':
                        return <BannerBlock key={idx} block={block} />;
                    default:
                        return null;
                }
            })}
        </>
    );
}
