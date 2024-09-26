import { Heading } from '@nordcom/nordstar';

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Changelog'
};

export type ChangelogPageParams = {};
export default async function ChangelogPage({}: {}) {
    return (
        <article>
            <header>
                <Heading level="h1" title="Changelog">
                    Changelog
                </Heading>
            </header>
        </article>
    );
}
