import { resolveLinkRef } from './resolve-link-ref';
import type { BlockRenderContext, MediaGridBlockNode, MediaItem } from './types';

const imageUrl = (item: MediaItem): string | undefined => {
    if (!item.image) return undefined;
    return typeof item.image === 'string' ? undefined : item.image.url;
};
const imageAlt = (item: MediaItem): string => {
    if (!item.image) return '';
    return typeof item.image === 'string' ? '' : (item.image.alt ?? '');
};
// Stable identity for the `<figure>` `key` — Payload media ID when the
// item embeds an object, the raw ID when the field is a string ref,
// falling back to the array index for items with no image at all (the
// CMS preview still renders an empty figure for those so caption-only
// entries don't disappear from the editor surface).
const itemKey = (item: MediaItem, idx: number): string => {
    if (!item.image) return `i-${idx}`;
    if (typeof item.image === 'string') return `${item.image}-${idx}`;
    return `${item.image.id}-${idx}`;
};

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
