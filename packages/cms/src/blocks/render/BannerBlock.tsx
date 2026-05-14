import { resolveLinkRef } from './resolve-link-ref';
import type { BannerBlockNode, BlockRenderContext } from './types';

// Wrap the CSS `url(...)` value in single quotes and escape the characters
// that could break out of the quoted string: backslash, single quote, and
// any line break (CSS strings can't span lines, so an unescaped newline
// terminates the value early). React escapes the attribute as a whole, but
// the *contents* of `url()` are CSS, not HTML — escaping is our job here.
const cssUrl = (raw: string): string => {
    const safe = raw
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/[\n\r]/g, '');
    return `url('${safe}')`;
};

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
