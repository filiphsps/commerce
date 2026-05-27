import { notFound } from 'next/navigation';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import type { Metadata } from 'next';
import { getMDXComponents } from '@/mdx-components';
import { source } from '@/lib/source';

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
    return (
        <DocsPage toc={page.data.toc}>
            <DocsTitle>{page.data.title}</DocsTitle>
            {page.data.description ? <DocsDescription>{page.data.description}</DocsDescription> : null}
            <DocsBody>
                <MDX components={getMDXComponents()} />
            </DocsBody>
        </DocsPage>
    );
}

/**
 * Statically pre-render every page from the Fumadocs source. Required for
 * `output: 'export'` builds.
 */
export function generateStaticParams() {
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
