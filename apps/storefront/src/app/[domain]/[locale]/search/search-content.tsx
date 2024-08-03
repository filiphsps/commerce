'use client';

import styles from './search-content.module.scss';

import { useCallback, useState } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { type Locale, type LocaleDictionary, useTranslation } from '@/utils/locale';
import debounce from 'lodash.debounce';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/actionable/button';

import type { Product, ProductFilters } from '@/api/product';

export type SearchContentProps = {
    shop: OnlineShop;
    locale: Locale;
    //client: AbstractApi;
    i18n: LocaleDictionary;
};
export default function SearchContent({ i18n }: SearchContentProps) {
    const { replace } = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { t } = useTranslation('common', i18n);
    const [results, setResults] = useState<Product[]>([]);
    const [filters, setFilters] = useState<ProductFilters>([]);

    const searchAction = useCallback(
        debounce(async () => {
            const query = searchParams.get('q')?.toString();
            if (!query) {
                setResults(() => []);
                setFilters(() => []);
                return;
            }

            /*const { products, productFilters } = await SearchApi({ query, client });
            setResults(() => products);
            setFilters(() => productFilters);*/
        }, 500),
        [searchParams]
    )!;

    const updateQuery = useCallback(
        (term?: string) => {
            const params = new URLSearchParams(searchParams);
            if (term) params.set('q', term);
            else params.delete('q');

            replace(`${pathname}?${params.toString()}`);
        },
        [searchParams, replace]
    );

    return (
        <>
            <div className={styles['search-bar']}>
                <input
                    className={styles.input}
                    type="search"
                    defaultValue={searchParams.get('q')?.toString()}
                    onChange={(e) => updateQuery(e.target.value)}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus={true}
                    spellCheck={true}
                    /* TODO: Make this copy configurable. */
                    placeholder="Search for products, brands, categories, collections, and more..."
                />

                <Button className={styles.button} onClick={() => console.warn('todo')} title="Search">
                    {t('search')}
                </Button>
            </div>
        </>
    );
}
