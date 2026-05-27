import type { HtmlBlockNode } from './types';

/**
 * Renders a {@link HtmlBlockNode} by injecting the raw HTML string via
 * `dangerouslySetInnerHTML`. Content is authored by admin-role users only;
 * the CMS access predicate on the `html` field enforces that constraint.
 *
 * @param block - The HTML block node containing the raw markup.
 * @returns A React div with the injected HTML.
 */
export function HtmlBlock({ block }: { block: HtmlBlockNode }) {
    return <div className="cms-html" dangerouslySetInnerHTML={{ __html: block.html }} />;
}
