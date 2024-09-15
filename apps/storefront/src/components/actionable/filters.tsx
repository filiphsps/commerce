import { type HTMLProps, Suspense } from 'react';

import { cn } from '@/utils/tailwind';

import { FilterValues } from '@/components/actionable/filter-values';
import { Card } from '@/components/layout/card';
import { Label } from '@/components/typography/label';

import type { Filter } from '@shopify/hydrogen-react/storefront-api-types';

export type FiltersProps = {
    filters: Filter[];
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export function Filters({ filters, className, ...props }: FiltersProps) {
    if (filters.length <= 0) {
        return null;
    }

    return (
        <section {...props} className={cn('flex gap-3 md:gap-4', className)}>
            {filters.map(({ id, label, type, values }) => {
                return (
                    <Card key={id} className="flex flex-col gap-2" border={true}>
                        <Label className="overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-none opacity-75">
                            {label}
                        </Label>

                        <div className="flex flex-wrap gap-1">
                            <Suspense fallback={<div>todo</div>}>
                                <FilterValues id={id} type={type} values={values} />
                            </Suspense>
                        </div>
                    </Card>
                );
            })}
        </section>
    );
}
