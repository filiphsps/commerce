import type { BannerBlockNode } from './types';

export function BannerBlock({ block }: { block: BannerBlockNode }) {
    const bgUrl = typeof block.background === 'string' ? undefined : block.background?.url;
    return (
        <section
            className={`cms-banner cms-banner--align-${block.alignment}`}
            style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : undefined}
        >
            <h1>{block.heading}</h1>
            {block.subheading ? <p>{block.subheading}</p> : null}
            {block.cta?.url ? (
                <a
                    className="cms-banner__cta"
                    href={block.cta.url}
                    target={block.cta.openInNewTab ? '_blank' : undefined}
                    rel="noreferrer"
                >
                    {block.cta.label}
                </a>
            ) : null}
        </section>
    );
}
