import { resolveLinkRef } from './resolve-link-ref';
import type { BannerBlockNode, BlockRenderContext } from './types';

/**
 * Wrap a URL in a CSS `url('...')` literal, escaping backslashes, single
 * quotes, and line breaks that would break out of the CSS string. React
 * escapes the HTML attribute as a whole but the `url()` contents are CSS,
 * so this escaping is required here rather than at the DOM boundary.
 *
 * @param raw - The raw URL string from the media upload.
 * @returns A CSS-safe `url('...')` expression.
 */
const cssUrl = (raw: string): string => {
    const safe = raw
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/[\n\r]/g, '');
    return `url('${safe}')`;
};

/**
 * Renders a {@link BannerBlockNode} as a full-width `<section>` with an
 * optional background image, heading, subheading, and CTA link. The CTA is
 * resolved through {@link resolveLinkRef} so all link kinds render correctly.
 *
 * @param block - The banner block node from the CMS.
 * @param context - Block render context supplying the active locale.
 * @returns A React section element.
 */
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
            style={bgUrl ? { backgroundImage: cssUrl(bgUrl) } : undefined}
        >
            <h1>{block.heading}</h1>
            {block.subheading ? <p>{block.subheading}</p> : null}
            {resolved ? (
                <a
                    className="cms-banner__cta"
                    href={resolved.href}
                    target={resolved.openInNewTab ? '_blank' : undefined}
                    rel="noopener noreferrer"
                >
                    {block.cta?.label}
                </a>
            ) : null}
        </section>
    );
}
