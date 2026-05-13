import type { HtmlBlockNode } from './types';

export function HtmlBlock({ block }: { block: HtmlBlockNode }) {
    return <div className="cms-html" dangerouslySetInnerHTML={{ __html: block.html }} />;
}
