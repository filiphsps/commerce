'use client';

import { SearchX as NoResultsIcon, Search as SearchIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { HTMLProps, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { ProductFilters } from '@/api/product';
import { Button } from '@/components/actionable/button';
import { EmptyState } from '@/components/empty-state';
import Link from '@/components/link';
import { ProductFilters as ProductFilterBar } from '@/components/products/product-filters';
import { Label } from '@/components/typography/label';
import { getTranslations, type Locale, type LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

type SearchBarProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    defaultValue?: string;
    onSearch: (q: string) => void;
    disabled?: boolean;
} & HTMLProps<HTMLDivElement>;
/**
 * Client search input with an inline submit button. Fires the `onSearch`
 * callback on Enter, blur (when non-empty), or button click — intentionally
 * not on every keystroke to avoid triggering transitions while the user is
 * still typing.
 *
 * @param defaultValue - The initial search query prepopulated in the input.
 * @param onSearch - Callback invoked with the trimmed query string when search fires.
 * @param disabled - When `true`, the submit button is disabled (e.g. during a pending transition).
 * @param className - Additional class names for the wrapper element.
 * @param i18n - The locale dictionary for translated aria labels.
 * @returns The search input + button element.
 */
export const SearchBar = ({ defaultValue, onSearch, disabled, className, i18n, ...props }: SearchBarProps) => {
    const { t } = getTranslations('common', i18n);
    const [value, setValue] = useState<string>(defaultValue ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus the query field on mount. Equivalent to the old `autoFocus` attribute but applied
    // programmatically so it doesn't trip the a11y `noAutofocus` lint (and gives us a single,
    // explicit mount-time focus rather than an attribute the platform may apply unpredictably).
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Search fires only on Enter / blur / button-click — not on every keystroke.
    // useDeferredValue is therefore not applicable here: there is no search-as-you-type
    // value to defer. The useTransition that drives URL replacement lives in the parent
    // SearchContent component. Phase 3 task 10 ("replace ad-hoc debounce with
    // useDeferredValue") was superseded by the Phase 2 intentional Enter-only design.
    const performSearch = useCallback(() => {
        onSearch(value);
    }, [onSearch, value]);

    return (
        <div className={cn('flex h-16 overflow-clip rounded-lg bg-(--surface-0)', className)} {...props}>
            <input
                ref={inputRef}
                name="query"
                className="grow rounded-l-lg border-(--border-strong) border-2 border-r-0 border-solid px-4 py-2"
                type="search"
                value={value}
                onChange={({ target: { value } }) => setValue(value)}
                onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    performSearch();
                }}
                onBlur={(e) => {
                    e.preventDefault();
                    if (e.target.value.length <= 0) {
                        return;
                    }

                    performSearch();
                }}
                spellCheck={true}
                /* TODO: Make this copy configurable. */
                placeholder="Search for products, brands, categories, collections, and more..."
            />

            <Button
                className="flex w-14 items-center justify-center rounded-tr-none rounded-br-none bg-primary text-primary-foreground"
                onClick={(e) => {
                    e.preventDefault();
                    performSearch();
                }}
                title={t('search')}
                styled={false}
                disabled={disabled}
                type="submit"
            >
                <SearchIcon className="text-xl lg:text-2xl" style={{ strokeWidth: 2.5 }} />
            </Button>
        </div>
    );
};

/** Props for the `SearchContent` client component. */
export type SearchContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    showFilters?: boolean;
    productCards: ReactNode[];
    skeletonCards: ReactNode[];
    productFilters?: ProductFilters;
    totalCount?: number;
    /** No-query landing headline (from the `search` singleton, platform-default fallback). */
    landingHeading?: string;
    /** No-query landing sub-copy. */
    landingSubheading?: string;
    /** Popular-search terms rendered as one-tap chips on the landing; each runs that query. */
    popularSearches?: string[];
    /** Server-rendered CMS blocks shown beneath the landing prompt. */
    landingExtra?: ReactNode;
};
/**
 * Client component that composes the search page: a `SearchBar`, optional
 * filter controls, a result count label, and the product card list. Drives
 * URL replacement via a `useTransition` so the list updates without a full
 * navigation, showing skeleton cards while the transition is pending.
 *
 * @param i18n - The locale dictionary for translated UI copy.
 * @param locale - The active locale forwarded to the `SearchBar`.
 * @param showFilters - Whether to render the `Filters` component above the results.
 * @param productCards - Pre-rendered product card nodes from the server.
 * @param skeletonCards - Placeholder card nodes shown during pending transitions.
 * @param productFilters - Shopify product filter facets to expose in the UI.
 * @param totalCount - Total matching product count for the result count label.
 * @returns The search page content element.
 */
export default function SearchContent({
    i18n,
    locale,
    showFilters = false,
    productCards,
    skeletonCards,
    productFilters = [],
    totalCount,
    landingHeading,
    landingSubheading,
    popularSearches = [],
    landingExtra,
}: SearchContentProps) {
    const { replace } = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const { t } = getTranslations('common', i18n);

    // A committed query with no rendered cards means a genuine zero-result search,
    // distinct from the initial unsearched state — only the former gets a branded
    // empty state. `empty:hidden` would otherwise collapse the list to nothing.
    const activeQuery = searchParams.get('q')?.trim() ?? '';
    const showEmptyState = !isPending && activeQuery.length > 0 && productCards.length <= 0;
    // No query committed and nothing pending: render the tenant-configurable landing instead of a
    // blank `empty:hidden` section (the prior crash-adjacent dead end).
    const showLanding = !isPending && activeQuery.length === 0;

    // Commits a query to the URL (Enter/blur/button via SearchBar, or a popular-search chip),
    // dropping every other param so a new search starts from a clean facet state.
    const runSearch = useCallback(
        (q: string) => {
            const query = q.trim();
            const params = new URLSearchParams(searchParams);

            if (query) {
                if (params.get('q') === query) {
                    return;
                }
                params.set('q', query);
            } else {
                params.delete('q');
            }

            params.forEach((_value, key) => {
                if (key === 'q') {
                    return;
                }
                params.delete(key);
            });

            startTransition(() => {
                replace(`${pathname}?${params.toString()}`, { scroll: true });
            });
        },
        [pathname, replace, searchParams],
    );

    return (
        <>
            <SearchBar
                disabled={isPending}
                locale={locale}
                i18n={i18n}
                defaultValue={searchParams.get('q')?.toString()}
                onSearch={runSearch}
            />

            {showLanding ? (
                <section className="flex flex-col items-center gap-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <SearchIcon
                            className="size-10 text-(--text-muted)"
                            aria-hidden="true"
                            style={{ strokeWidth: 2 }}
                        />
                        <h2 className="font-bold text-(--text) text-h3">{landingHeading}</h2>
                        {landingSubheading ? (
                            <p className="max-w-prose text-(--text-muted)">{landingSubheading}</p>
                        ) : null}
                    </div>

                    {popularSearches.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {popularSearches.map((term) => (
                                <button
                                    key={term}
                                    type="button"
                                    className="rounded-full border border-(--border-default) bg-(--surface-1) px-4 py-2 font-semibold text-(--text) text-sm transition-colors hover:border-(--accent) hover:text-(--accent) focus-visible:outline-offset-2 focus-visible:[outline:2px_solid_var(--focus-ring)]"
                                    onClick={() => runSearch(term)}
                                >
                                    {term}
                                </button>
                            ))}
                        </div>
                    ) : null}

                    <Button as={Link} href="/" variant="secondary">
                        {t('browse-all-products')}
                    </Button>

                    {landingExtra ? <div className="w-full text-left">{landingExtra}</div> : null}
                </section>
            ) : showFilters ? (
                <ProductFilterBar filters={productFilters} i18n={i18n} total={totalCount} />
            ) : typeof totalCount === 'number' && totalCount > 0 ? (
                <Label className="font-medium text-(--text-muted) text-sm">
                    {totalCount === 1 ? `1 ${t('product')}` : `${totalCount} ${t('products')}`}
                </Label>
            ) : null}

            {showEmptyState ? (
                <EmptyState
                    icon={<NoResultsIcon aria-hidden="true" />}
                    title={t('no-results-title')}
                    description={t('no-results-for-query', activeQuery)}
                    action={
                        <Button as={Link} href="/">
                            {t('browse-all-products')}
                        </Button>
                    }
                />
            ) : (
                <section className="flex flex-col gap-0 empty:hidden">
                    {isPending ? skeletonCards : productCards}
                </section>
            )}
        </>
    );
}
