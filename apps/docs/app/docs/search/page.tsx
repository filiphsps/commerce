import type { Metadata } from 'next';
import Link from 'next/link';
import { getWorkspacesByType, type PageMapEntry } from '@/lib/page-map';

export const metadata: Metadata = { title: 'Search' };

function firstPage(w: PageMapEntry): string {
    if (w.pages.includes('overview')) return 'overview';
    if (w.pages.includes('index')) return 'index';
    return w.pages[0] ?? 'index';
}

export default function SearchFallback() {
    const { apps, packages } = getWorkspacesByType();
    return (
        <main style={{ padding: '2rem' }}>
            <h1>Browse all pages</h1>
            <p>Try Cmd+K for fast search. This page lists every workspace as a fallback.</p>
            <section>
                <h2>Apps</h2>
                <ul>
                    {apps.map((w) => (
                        <li key={w.slug}>
                            <Link href={`/docs/${w.slug}/${firstPage(w)}/`}>{w.slug}</Link>
                        </li>
                    ))}
                </ul>
            </section>
            <section>
                <h2>Packages</h2>
                <ul>
                    {packages.map((w) => (
                        <li key={w.slug}>
                            <Link href={`/docs/${w.slug}/${firstPage(w)}/`}>{w.slug}</Link>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
