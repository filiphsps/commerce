import type { MediaGridBlockNode, MediaItem } from './types';

const imageUrl = (item: MediaItem): string | undefined => {
    if (!item.image) return undefined;
    return typeof item.image === 'string' ? undefined : item.image.url;
};
const imageAlt = (item: MediaItem): string => {
    if (!item.image) return '';
    return typeof item.image === 'string' ? '' : (item.image.alt ?? '');
};

export function MediaGridBlock({ block }: { block: MediaGridBlockNode }) {
    return (
        <div className="cms-media-grid" data-item-type={block.itemType} style={{ ['--cols' as string]: block.columns }}>
            {block.items.map((item, idx) => {
                const url = imageUrl(item);
                const inner = url ? <img src={url} alt={imageAlt(item)} loading="lazy" /> : null;
                const wrapped = item.link?.url ? (
                    <a href={item.link.url} target={item.link.openInNewTab ? '_blank' : undefined} rel="noreferrer">
                        {inner}
                    </a>
                ) : (
                    inner
                );
                return (
                    <figure key={idx}>
                        {wrapped}
                        {item.caption ? <figcaption>{item.caption}</figcaption> : null}
                    </figure>
                );
            })}
        </div>
    );
}
