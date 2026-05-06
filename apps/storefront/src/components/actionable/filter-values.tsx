'use client';

import type { Filter } from '@shopify/hydrogen-react/storefront-api-types';
import { usePathname, useSearchParams } from 'next/navigation';

import Link from '@/components/link';
import { cn } from '@/utils/tailwind';

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
                    {values.map(({ label, id: _id, count }) => {
                        const id = _id.split('.').at(-1)!;
                        const active = searchParams.has(filterId) && searchParams.get(filterId) === id;

                        searchParams.delete(filterId);
                        searchParams.set(filterId, id);

                        return (
                            <Link
                                key={id}
                                data-value={id}
                                href={`${baseUrl}${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`}
                                replace={true}
                                shallow={true}
                                prefetch={false}
                                className={cn(
                                    'flex appearance-none flex-nowrap items-center justify-between gap-1 whitespace-nowrap rounded-xl border-2 border-gray-300 border-solid px-2 py-1 font-semibold text-gray-500 text-sm leading-none transition-colors hover:border-black hover:text-black',
                                    active && 'border-primary text-primary',
                                )}
                            >
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
            console.warn('Unknown filter type:', type);
            return null;
        }
    }
}
FilterValues.displayName = 'Nordcom.Actionable.Filters.FilterValues';
