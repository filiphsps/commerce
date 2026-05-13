import { resolveLinkRef } from './resolve-link-ref';
import type { BannerBlockNode, BlockRenderContext } from './types';

export function BannerBlock({ block, context }: { block: BannerBlockNode; context: BlockRenderContext }) {
    const bgUrl = typeof block.background === 'string' ? undefined : block.background?.url;
    // The CTA is a `linkField` group — it can point at a page, article,
    // product, collection, external URL, or anchor. The previous code only
    // read `cta.url`, so internal links (kind=page/article/...) had no
    // resolved href and the entire CTA disappeared. Route through
    // resolveLinkRef so every link kind renders.
    const resolved = resolveLinkRef(block.cta, { locale: context.locale });
    return (
        <section
            className={`cms-banner cms-banner--align-${block.alignment}`}
            style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : undefined}
        >
            <h1>{block.heading}</h1>
            {block.subheading ? <p>{block.subheading}</p> : null}
            {resolved ? (
                <a
                    className="cms-banner__cta"
                    href={resolved.href}
                    target={resolved.openInNewTab ? '_blank' : undefined}
                    rel="noreferrer"
                >
                    {block.cta?.label}
                </a>
            ) : null}
        </section>
    );
}
