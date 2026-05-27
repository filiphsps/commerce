import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { source } from '@/lib/source';
import { getMDXComponents } from '@/mdx-components';

/**
 * Catch-all docs page handler. Fumadocs source resolves slug → MDX module
 * and returns null when there's no match.
 *
 * @param props - Next 16 async-params props.
 * @returns The rendered docs page or 404.
 */
export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
    const params = await props.params;
    const page = source.getPage(params.slug);
    if (!page) notFound();

    const MDX = page.data.body;
    const firstSeg = params.slug?.[0];
    const tab: 'docs' | 'packages' | 'reference' | 'errors' =
        firstSeg === 'packages' || firstSeg === 'reference' || firstSeg === 'errors' ? firstSeg : 'docs';
    // Errors render `<ErrorHero>` and reference pages render `<SymbolTitle>` —
    // both own the title surface, so skip Fumadocs's default DocsTitle on
    // those tabs (except for the tab landing index page, which has no slug).
    const isLeafPage = (params.slug?.length ?? 0) > 1;
    const showHero = !(tab === 'errors' && isLeafPage) && !(tab === 'reference' && isLeafPage);
    return (
        <DocsPage toc={page.data.toc} breadcrumb={{ enabled: true, includeRoot: true }}>
            {showHero ? (
                <>
                    <DocsTitle className="font-extrabold text-[2.6rem] leading-[1.05] tracking-[-0.035em]">
                        {page.data.title}
                    </DocsTitle>
                    {page.data.description ? (
                        <DocsDescription className="mb-10 max-w-[60ch] font-medium text-[1.15rem] text-fg-mute leading-relaxed">
                            {page.data.description}
                        </DocsDescription>
                    ) : null}
                </>
            ) : null}
            <DocsBody className={`${tab}-page`}>
                <MDX components={getMDXComponents()} />
            </DocsBody>
        </DocsPage>
    );
}

/**
 * Statically pre-render every page from the Fumadocs source. Required for
 * `output: 'export'` builds. The Fumadocs source already emits the root
 * entry with `slug: []`; pass that through verbatim.
 *
 * @returns The list of `{ slug }` params Next will pre-render.
 */
export function generateStaticParams(): { slug: string[] }[] {
    return source.generateParams();
}

/**
 * Per-page metadata pulled from the MDX frontmatter.
 *
 * @returns Next Metadata, or empty when the page doesn't exist.
 */
export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
    const params = await props.params;
    const page = source.getPage(params.slug);
    if (!page) return {};
    return { title: page.data.title, description: page.data.description };
}
