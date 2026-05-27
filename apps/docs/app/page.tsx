import Link from 'next/link';

export default function Home() {
    return (
        <main style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <h1>Nordcom Commerce</h1>
            <p>
                Docs site under reconstruction. Try <Link href="/docs/getting-started/">Getting Started</Link>.
            </p>
        </main>
    );
}
