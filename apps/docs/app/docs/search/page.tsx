import Link from 'next/link';
import { getWorkspacesByType } from '@/lib/page-map';

export const metadata = { title: 'Search' };

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
                            <Link href={`/docs/${w.slug}/index/`}>{w.slug}</Link>
                        </li>
                    ))}
                </ul>
            </section>
            <section>
                <h2>Packages</h2>
                <ul>
                    {packages.map((w) => (
                        <li key={w.slug}>
                            <Link href={`/docs/${w.slug}/index/`}>{w.slug}</Link>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
