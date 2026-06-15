'use client';

import type { Filter } from '@shopify/hydrogen-react/storefront-api-types';
import { SlidersHorizontal as FilterIcon, X as XIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useRef, useState, useTransition } from 'react';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

// Sort options map to `ProductSortKeys`; the label is the default value so deselecting it clears the
// param. Labels are literal pending localization keys (tracked as a follow-up) so the feature ships
// without blocking on six locale files.
const SORT_OPTIONS = [
    { value: 'BEST_SELLING', label: 'Best selling' },
    { value: 'CREATED', label: 'Newest' },
    { value: 'PRICE', label: 'Price' },
    { value: 'TITLE', label: 'Alphabetical' },
] as const;

type FacetKind = 'availability' | 'vendor' | 'type' | 'price';

/**
 * Classifies a Shopify filter id into the facet the UI knows how to apply, or `null` to skip it.
 * Application is decoupled from Shopify's opaque per-value `input` JSON: the UI writes a human-named
 * param (`vendor` / `type` / `available` / price bounds) and `ProductsPaginationApi` turns those into
 * Shopify search syntax. Filters that don't map to a named param (e.g. variant options) are skipped
 * so no facet is shown that the listing can't actually apply.
 *
 * @param id - The Shopify filter id (e.g. `filter.p.vendor`).
 * @returns The mapped facet kind, or `null` when the filter is not applicable here.
 */
const facetKind = (id: string): FacetKind | null => {
    const lower = id.toLowerCase();
    if (lower.includes('availab')) return 'availability';
    if (lower.includes('vendor')) return 'vendor';
    if (lower.includes('product_type') || lower.includes('producttype')) return 'type';
    if (lower.includes('price')) return 'price';
    return null;
};

export type ProductFiltersProps = {
    filters: Filter[];
    i18n: LocaleDictionary;
    /** Total result count shown in the toolbar. */
    total?: number;
};

/**
 * Shared faceted product filter: a sort control, a removable active-filter chip row, the facet groups
 * (availability, vendor, product type, price) Shopify returns for the current result set, and a
 * bottom-sheet drawer on mobile. Drives the listing by writing named URL params (`vendor` / `type` /
 * `available` / `minPrice` / `maxPrice` / `sorting`) which `ProductsPaginationApi` compiles into
 * Shopify search syntax. Price bounds are validated before they commit.
 *
 * @param props.filters - Shopify filters for the current result set.
 * @param props.i18n - Locale dictionary for the (existing) control labels.
 * @param props.total - Total matching product count, shown in the toolbar.
 * @returns The faceted filter UI.
 */
export function ProductFilters({ filters, i18n, total }: ProductFiltersProps) {
    const { replace } = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [priceError, setPriceError] = useState<string | null>(null);
    const minRef = useRef<HTMLInputElement>(null);
    const maxRef = useRef<HTMLInputElement>(null);
    const { t } = getTranslations('common', i18n);

    /**
     * Replaces the current URL with `params`, resetting pagination, inside a transition.
     *
     * @param params - The next query params.
     */
    const commit = useCallback(
        (params: URLSearchParams) => {
            params.delete('page');
            const qs = params.toString();
            startTransition(() => replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false }));
        },
        [pathname, replace],
    );

    /**
     * Sets or clears a single param, then commits.
     *
     * @param key - The param key.
     * @param value - The next value, or `null`/`''` to remove the key.
     */
    const setParam = useCallback(
        (key: string, value: string | null) => {
            const params = new URLSearchParams(searchParams);
            if (value === null || value === '') {
                params.delete(key);
            } else {
                params.set(key, value);
            }
            commit(params);
        },
        [searchParams, commit],
    );

    /**
     * Validates and applies both price bounds together. Rejects negatives, non-numbers, and an
     * inverted range (min greater than max) with an inline error instead of committing a query that
     * would silently return nothing.
     */
    const applyPrice = useCallback(() => {
        const rawMin = (minRef.current?.value ?? '').trim();
        const rawMax = (maxRef.current?.value ?? '').trim();
        const min = rawMin === '' ? null : Number(rawMin);
        const max = rawMax === '' ? null : Number(rawMax);

        const invalid = (n: number | null) => n !== null && (!Number.isFinite(n) || n < 0);
        if (invalid(min) || invalid(max)) {
            setPriceError(t('invalid-price'));
            return;
        }
        if (min !== null && max !== null && min > max) {
            setPriceError(t('invalid-price-range'));
            return;
        }

        setPriceError(null);
        const params = new URLSearchParams(searchParams);
        if (rawMin) params.set('minPrice', rawMin);
        else params.delete('minPrice');
        if (rawMax) params.set('maxPrice', rawMax);
        else params.delete('maxPrice');
        commit(params);
    }, [searchParams, commit, t]);

    const recognized = filters
        .map((filter) => ({ filter, kind: facetKind(filter.id) }))
        .filter((entry): entry is { filter: Filter; kind: FacetKind } => entry.kind !== null);

    const vendor = searchParams.get('vendor');
    const type = searchParams.get('type');
    const available = searchParams.get('available');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    const activeChips: Array<{ key: string; label: string }> = [];
    if (vendor) activeChips.push({ key: 'vendor', label: vendor });
    if (type) activeChips.push({ key: 'type', label: type });
    if (available === 'true') activeChips.push({ key: 'available', label: 'In stock' });
    if (minPrice || maxPrice) activeChips.push({ key: 'price', label: `${minPrice || '0'}–${maxPrice || '∞'}` });

    /** Clears a named facet (and both price bounds + the error for the price chip). */
    const clearChip = (key: string) => {
        const params = new URLSearchParams(searchParams);
        if (key === 'price') {
            params.delete('minPrice');
            params.delete('maxPrice');
            setPriceError(null);
        } else {
            params.delete(key);
        }
        commit(params);
    };

    const facetGroups = (
        <div className="flex flex-col gap-1" data-testid="product-filters">
            {recognized.map(({ filter, kind }) => (
                <details key={filter.id} className="border-(--border-default) border-b border-solid" open={true}>
                    <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-semibold text-sm">
                        {filter.label}
                    </summary>
                    <div className="flex flex-col gap-2 pb-4">
                        {kind === 'price' ? (
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={minRef}
                                        type="number"
                                        min={0}
                                        inputMode="decimal"
                                        aria-label="Minimum price"
                                        aria-invalid={priceError !== null}
                                        defaultValue={minPrice ?? ''}
                                        placeholder="Min"
                                        onBlur={applyPrice}
                                        className="w-full rounded-md border border-(--border-default) border-solid bg-(--surface-0) px-2 py-1.5 text-sm aria-[invalid=true]:border-(--state-danger)"
                                    />
                                    <span className="text-(--text-muted)">–</span>
                                    <input
                                        ref={maxRef}
                                        type="number"
                                        min={0}
                                        inputMode="decimal"
                                        aria-label="Maximum price"
                                        aria-invalid={priceError !== null}
                                        defaultValue={maxPrice ?? ''}
                                        placeholder="Max"
                                        onBlur={applyPrice}
                                        className="w-full rounded-md border border-(--border-default) border-solid bg-(--surface-0) px-2 py-1.5 text-sm aria-[invalid=true]:border-(--state-danger)"
                                    />
                                </div>
                                {priceError ? (
                                    <p role="alert" className="font-medium text-(--state-danger) text-xs">
                                        {priceError}
                                    </p>
                                ) : null}
                            </div>
                        ) : kind === 'availability' ? (
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={available === 'true'}
                                    onChange={(e) => setParam('available', e.target.checked ? 'true' : null)}
                                    className="size-4 accent-(--accent)"
                                />
                                In stock
                            </label>
                        ) : (
                            filter.values.map((value) => {
                                const active = searchParams.get(kind) === value.label;
                                return (
                                    <label key={value.id} className="flex cursor-pointer items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={() => setParam(kind, active ? null : value.label)}
                                            className="size-4 accent-(--accent)"
                                        />
                                        <span className="grow">{value.label}</span>
                                        {typeof value.count === 'number' ? (
                                            <span className="text-(--text-muted) text-xs">{value.count}</span>
                                        ) : null}
                                    </label>
                                );
                            })
                        )}
                    </div>
                </details>
            ))}
        </div>
    );

    return (
        <div className={cn('flex flex-col gap-3', isPending && 'pointer-events-none opacity-60')}>
            <div className="flex items-center gap-3">
                {typeof total === 'number' ? (
                    <span className="mr-auto font-medium text-(--text-muted) text-sm">
                        {total === 1 ? `1 ${t('product')}` : `${total} ${t('products')}`}
                    </span>
                ) : null}

                <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    disabled={recognized.length === 0}
                    className="focus-ring inline-flex items-center gap-2 rounded-lg border border-(--border-default) border-solid px-3 py-2 font-semibold text-sm disabled:opacity-40"
                >
                    <FilterIcon className="size-4" aria-hidden={true} />
                    Filters
                    {activeChips.length > 0 ? (
                        <span className="rounded-full bg-(--accent) px-1.5 text-(--accent-primary-text) text-xs">
                            {activeChips.length}
                        </span>
                    ) : null}
                </button>

                <select
                    aria-label="Sort"
                    value={searchParams.get('sorting') ?? SORT_OPTIONS[0].value}
                    onChange={(e) =>
                        setParam('sorting', e.target.value === SORT_OPTIONS[0].value ? null : e.target.value)
                    }
                    className="focus-ring rounded-lg border border-(--border-default) border-solid bg-(--surface-0) px-3 py-2 font-semibold text-sm"
                >
                    {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {activeChips.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                    {activeChips.map((chip) => (
                        <button
                            key={chip.key}
                            type="button"
                            onClick={() => clearChip(chip.key)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-(--border-default) border-solid bg-(--surface-1) px-3 py-1 font-semibold text-sm"
                        >
                            {chip.label}
                            <XIcon className="size-3.5 text-(--text-muted)" aria-hidden={true} />
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => commit(new URLSearchParams())}
                        className="font-semibold text-(--accent) text-sm"
                    >
                        Clear all
                    </button>
                </div>
            ) : null}

            {drawerOpen ? (
                <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
                    <button
                        type="button"
                        aria-label={t('close')}
                        onClick={() => setDrawerOpen(false)}
                        className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-dark)_55%,transparent)]"
                    />
                    {/* Bottom sheet on mobile; a right-side panel from md up. */}
                    <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-(--surface-0) p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[24rem] md:max-w-[90vw] md:rounded-t-none md:pb-5">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="font-bold text-lg">Filters</span>
                            <button type="button" aria-label={t('close')} onClick={() => setDrawerOpen(false)}>
                                <XIcon className="size-5" aria-hidden={true} />
                            </button>
                        </div>
                        {facetGroups}
                        <button
                            type="button"
                            onClick={() => setDrawerOpen(false)}
                            className="focus-ring mt-4 w-full rounded-lg bg-(--product-card-cta-bg) py-3 font-semibold text-(--product-card-cta-color)"
                        >
                            {typeof total === 'number' ? `View (${total})` : 'View'}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

ProductFilters.displayName = 'Nordcom.Products.ProductFilters';
