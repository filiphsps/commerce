'use client';

import { useDocsSearch } from 'fumadocs-core/search/client';
import { oramaStaticClient } from 'fumadocs-core/search/client/orama-static';
import {
    SearchDialog,
    SearchDialogClose,
    SearchDialogContent,
    SearchDialogHeader,
    SearchDialogIcon,
    SearchDialogInput,
    SearchDialogList,
    SearchDialogOverlay,
} from 'fumadocs-ui/components/dialog/search';
import type { SharedProps } from 'fumadocs-ui/contexts/search';
import { useMemo } from 'react';

type StaticSearchDialogProps = SharedProps & {
    /** URL of the build-time Orama index served by the docs `staticGET` route. */
    api?: string;
    /** Empty-state quick links forwarded by the search provider. */
    links?: [name: string, href: string][];
};

/**
 * Client-side search dialog backed by the build-time Orama index.
 *
 * fumadocs 16.10 dropped static-index support from its bundled default dialog —
 * that dialog now hard-wires the fetch/server client. The docs app is a static
 * export (`output: 'export'`) whose `/api/search` route only emits a `staticGET`
 * index file; there is no server to answer per-query requests, so the fetch
 * client cannot work here. This rebuilds the default dialog markup against
 * `oramaStaticClient`, which downloads that index once and runs Orama in the
 * browser.
 *
 * @param props - Dialog open state plus the provider-forwarded `api` (index URL) and `links`.
 * @returns The search dialog wired to the static Orama client.
 */
export function StaticSearchDialog({ api, links = [], ...props }: StaticSearchDialogProps) {
    const { search, setSearch, query } = useDocsSearch({ client: oramaStaticClient({ from: api }) });

    const defaultItems = useMemo(
        () =>
            links.length > 0
                ? links.map(([name, url]) => ({ type: 'page' as const, id: name, content: name, url }))
                : null,
        [links],
    );

    return (
        <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
            <SearchDialogOverlay />
            <SearchDialogContent>
                <SearchDialogHeader>
                    <SearchDialogIcon />
                    <SearchDialogInput />
                    <SearchDialogClose />
                </SearchDialogHeader>
                <SearchDialogList items={query.data !== 'empty' ? query.data : defaultItems} />
            </SearchDialogContent>
        </SearchDialog>
    );
}
