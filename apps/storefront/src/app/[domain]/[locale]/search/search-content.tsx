'use client';

import { Search as SearchIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { HTMLProps, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { ProductFilters } from '@/api/product';
import { Button } from '@/components/actionable/button';
import { Filters } from '@/components/actionable/filters';
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
        <div className={cn('flex h-16 overflow-clip rounded-lg bg-white', className)} {...props}>
            <input
                ref={inputRef}
                name="query"
                className="grow rounded-l-lg border-2 border-gray-300 border-r-0 border-solid px-4 py-2"
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
}: SearchContentProps) {
    const { replace } = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const { t } = getTranslations('common', i18n);

    return (
        <>
            <SearchBar
                disabled={isPending}
                locale={locale}
                i18n={i18n}
                defaultValue={searchParams.get('q')?.toString()}
                onSearch={async (q) => {
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
                }}
            />

            {showFilters ? <Filters disabled={isPending} filters={productFilters} /> : null}

            {typeof totalCount === 'number' && totalCount > 0 ? (
                <Label className="font-medium text-gray-600 text-sm">
                    {totalCount === 1 ? `1 ${t('product')}` : `${totalCount} ${t('products')}`}
                </Label>
            ) : null}

            <section className="flex flex-col gap-0 empty:hidden">{isPending ? skeletonCards : productCards}</section>
        </>
    );
}
