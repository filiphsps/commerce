import { resolveLinkRef } from './resolve-link-ref';
import type { BlockRenderContext, MediaGridBlockNode, MediaItem } from './types';

/**
 * Extract the upload URL from a media item. Returns `undefined` when the image
 * relation is unpopulated (stored as a raw id string) or missing.
 *
 * @param item - A single media grid item from the block node.
 * @returns The image URL, or `undefined`.
 */
const imageUrl = (item: MediaItem): string | undefined => {
    if (!item.image) return undefined;
    return typeof item.image === 'string' ? undefined : item.image.url;
};
/**
 * Extract the alt text from a media item. Returns an empty string when the
 * image is unpopulated.
 *
 * @param item - A single media grid item from the block node.
 * @returns Alt text string, or `''`.
 */
const imageAlt = (item: MediaItem): string => {
    if (!item.image) return '';
    return typeof item.image === 'string' ? '' : (item.image.alt ?? '');
};
/**
 * Derive a stable React list key for a media grid item. Prefers the Payload
 * media doc id (populated) or the raw id string (unpopulated), falling back
 * to the array index for image-less items so caption-only entries stay visible
 * in the editor preview.
 *
 * @param item - The media grid item.
 * @param idx - The item's position in the array, used as a fallback key.
 * @returns A string key unique within the current grid.
 */
const itemKey = (item: MediaItem, idx: number): string => {
    if (!item.image) return `i-${idx}`;
    if (typeof item.image === 'string') return `${item.image}-${idx}`;
    return `${item.image.id}-${idx}`;
};

/**
 * Renders a {@link MediaGridBlockNode} as a CSS grid of image/icon items. Each
 * item's image is optionally wrapped in a link resolved via {@link resolveLinkRef}.
 *
 * @param block - The media grid block node with items, column count, and item type.
 * @param context - Block render context supplying the active locale.
 * @returns A React div containing figure elements for each grid item.
 */
export function MediaGridBlock({ block, context }: { block: MediaGridBlockNode; context: BlockRenderContext }) {
    return (
        <div className="cms-media-grid" data-item-type={block.itemType} style={{ ['--cols' as string]: block.columns }}>
            {block.items.map((item, idx) => {
                const url = imageUrl(item);
                // biome-ignore lint/performance/noImgElement: FIXME.
                const inner = url ? <img src={url} alt={imageAlt(item)} loading="lazy" /> : null;
                // Same fix as BannerBlock — the previous code only honoured
                // raw `link.url`, dropping every internal link kind. Route
                // through resolveLinkRef so page/article/product/collection
                // links wrap the image too.
                const resolved = resolveLinkRef(item.link, { locale: context.locale });
                const wrapped = resolved ? (
                    <a href={resolved.href} target={resolved.openInNewTab ? '_blank' : undefined} rel="noreferrer">
                        {inner}
                    </a>
                ) : (
                    inner
                );

                return (
                    <figure key={itemKey(item, idx)}>
                        {wrapped}
                        {item.caption ? <figcaption>{item.caption}</figcaption> : null}
                    </figure>
                );
            })}
        </div>
    );
}
