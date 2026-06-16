'use client';

import type { Filter } from '@shopify/hydrogen-react/storefront-api-types';
import { usePathname, useSearchParams } from 'next/navigation';

import Link from '@/components/link';
import { cn } from '@/utils/tailwind';

/**
 * Renders the interactive value list for a single Shopify collection filter. `LIST` values are
 * URL-driven toggles: selecting a value sets the filter query param, and clicking the already-active
 * value clears it (the active value is marked `aria-current` / `data-active`). `BOOLEAN` and
 * `PRICE_RANGE` are not yet implemented.
 *
 * @param props.id - Filter identifier used as the URL query key.
 * @param props.type - Shopify filter type (`LIST`, `BOOLEAN`, `PRICE_RANGE`, etc.).
 * @param props.values - Available filter values to render.
 * @returns The filter value controls, or `null` when `values` is empty or the type is unsupported.
 */
export function FilterValues({ id: filterId, type, values }: Pick<Filter, 'type' | 'values' | 'id'>) {
    const pathname = usePathname();
    const baseUrl = `${pathname}`;

    const searchParams = new URLSearchParams(useSearchParams());

    if (values.length <= 0) {
        return null;
    }

    switch (type) {
        case 'BOOLEAN': {
            return <div className={cn('')}>BOOLEAN</div>;
        }
        case 'LIST': {
            return (
                <div className={cn('flex flex-wrap gap-1')}>
                    {values.map(({ label, id: _id, count, swatch }) => {
                        const id = _id.split('.').at(-1)!;
                        const active = searchParams.get(filterId) === id;

                        // Toggle semantics: an active value links to clearing itself so a shopper can
                        // deselect a facet by clicking it again. Build each href from a fresh copy so
                        // one value's mutation never leaks into the next iteration.
                        const params = new URLSearchParams(searchParams);
                        if (active) {
                            params.delete(filterId);
                        } else {
                            params.set(filterId, id);
                        }
                        const query = params.toString();

                        return (
                            <Link
                                key={id}
                                data-value={id}
                                data-active={active || undefined}
                                aria-current={active ? 'true' : undefined}
                                href={`${baseUrl}${query ? `?${query}` : ''}`}
                                replace={true}
                                shallow={true}
                                prefetch={false}
                                className={cn(
                                    'text-(color:var(--text-muted)) hover:text-(color:var(--text)) flex appearance-none flex-nowrap items-center justify-between gap-1 whitespace-nowrap rounded-xl border-(--border-strong) border-2 border-solid px-2 py-1 font-semibold text-sm leading-none transition-colors hover:border-(--text)',
                                    active && 'border-primary text-primary',
                                )}
                            >
                                {swatch?.color ? (
                                    <span
                                        aria-hidden={true}
                                        className="inline-block size-3 rounded-full border border-(--border-default) border-solid"
                                        style={{ backgroundColor: swatch.color }}
                                    />
                                ) : null}
                                <span>{label}</span> <span className="font-normal text-xs">({count})</span>
                            </Link>
                        );
                    })}
                </div>
            );
        }
        case 'PRICE_RANGE': {
            return <div className={cn('')}>PRICE_RANGE</div>;
        }
        default: {
            return null;
        }
    }
}
FilterValues.displayName = 'Nordcom.Actionable.Filters.FilterValues';
