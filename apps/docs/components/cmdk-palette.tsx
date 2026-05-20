'use client';

import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { docsEnv } from '@/lib/env';

type PagefindResultData = {
    url: string;
    meta: { title?: string };
    excerpt: string;
};

type PagefindResult = {
    id: string;
    data: () => Promise<PagefindResultData>;
};

type PagefindApi = {
    search: (query: string) => Promise<{ results: PagefindResult[] }>;
};

type RenderableResult = {
    url: string;
    title: string;
    excerpt: string;
};

/**
 * Dynamically imports Pagefind from a runtime URL. Wrapped in `new Function`
 * to opt out of Webpack/Turbopack static analysis — neither bundler should
 * try to resolve `${basePath}/_pagefind/pagefind.js` at build time because
 * the file only exists in the static output, not in the module graph.
 */
async function loadPagefind(url: string): Promise<PagefindApi> {
    const dynamicImport = new Function('u', 'return import(u)') as (u: string) => Promise<unknown>;
    const mod = (await dynamicImport(url)) as PagefindApi & { default?: PagefindApi };
    return mod.default ?? mod;
}

export function CmdkPalette(): React.JSX.Element | null {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<RenderableResult[]>([]);
    const [pagefind, setPagefind] = useState<PagefindApi | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Case-insensitive match — some test drivers (notably Playwright) emit
            // `key: 'K'` for Meta+K, while real browsers emit lowercase. Accept both.
            if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (!open || pagefind) return;
        const url = `${docsEnv.basePath}/_pagefind/pagefind.js`;
        loadPagefind(url)
            .then(setPagefind)
            .catch((err) => console.warn('[CmdkPalette] failed to load Pagefind', err));
    }, [open, pagefind]);

    useEffect(() => {
        if (!pagefind || !query) {
            setResults([]);
            return;
        }
        let cancelled = false;
        pagefind.search(query).then(async ({ results: hits }) => {
            const data = await Promise.all(hits.slice(0, 10).map((r) => r.data()));
            if (cancelled) return;
            setResults(
                data.map((d) => ({
                    url: d.url,
                    title: d.meta.title ?? d.url,
                    excerpt: d.excerpt,
                })),
            );
        });
        return () => {
            cancelled = true;
        };
    }, [query, pagefind]);

    if (!open) return null;

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Command Menu"
            className="cmdk-dialog"
        >
            <Command.Input value={query} onValueChange={setQuery} placeholder="Search docs…" />
            <Command.List>
                {results.length === 0 && query ? <Command.Empty>No results</Command.Empty> : null}
                {results.map((r) => (
                    <Command.Item
                        key={r.url}
                        value={r.title}
                        onSelect={() => {
                            window.location.href = r.url;
                        }}
                    >
                        <div>
                            <strong>{r.title}</strong>
                            <div
                                style={{ fontSize: '0.85em', opacity: 0.7 }}
                                dangerouslySetInnerHTML={{ __html: r.excerpt }}
                            />
                        </div>
                    </Command.Item>
                ))}
            </Command.List>
        </Command.Dialog>
    );
}
