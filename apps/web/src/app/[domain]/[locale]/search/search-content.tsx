'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/actionable/button';
import type { Locale } from '@/utils/locale';
import type { Shop } from '@nordcom/commerce-database';
import styles from './search-content.module.scss';

export type SearchContentProps = {
    shop: Shop;
    locale: Locale;
};
export default function SearchContent({}: SearchContentProps) {
    const { replace } = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    function handleSearch(term?: string) {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('q', term);
        } else {
            params.delete('q');
        }

        replace(`${pathname}?${params.toString()}`);
    }

    return (
        <>
            <div className={styles['search-bar']}>
                <input
                    className={styles.input}
                    type="search"
                    defaultValue={searchParams.get('q')?.toString()}
                    onChange={(e) => handleSearch(e.target.value)}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus={true}
                    spellCheck={true}
                    /* TODO: Make this copy configurable. */
                    placeholder="Search for products, brands, categories, collections, and more..."
                />

                <Button className={styles.button} onClick={() => console.warn('todo')} title="Search">
                    Search
                </Button>
            </div>
        </>
    );
}
