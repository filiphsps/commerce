import { cn } from '@/utils/tailwind';
import { Search as SearchIcon } from 'lucide-react';

import { Button } from '@/components/actionable/button';

import type { HTMLProps } from 'react';

const DROPDOWN_ITEM_STYLES = 'leading-none';

export type SearchBarProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export function SearchBar({ className, ...props }: SearchBarProps) {
    return (
        <div className="relative">
            <div
                draggable={false}
                {...props}
                className={cn('flex overflow-clip rounded-xl border-2 border-solid border-gray-300', className)}
            >
                <input
                    name="query"
                    className="w-full p-2 pl-3 outline-none"
                    type="search"
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus={true}
                    spellCheck={true}
                    /* TODO: Make this copy configurable. */
                    placeholder="Search for products, brands, categories, collections, and more..."
                />

                <Button styled={false} className="px-3 hover:bg-red-500">
                    <SearchIcon style={{ strokeWidth: 2.5 }} />
                </Button>
            </div>

            <div className="absolute inset-x-0 inset-y-full mt-2 flex h-fit w-full flex-col gap-2 overflow-auto rounded-lg border-2 border-solid border-gray-300 bg-gray-100 p-3 shadow-lg">
                <div className={DROPDOWN_ITEM_STYLES}>test</div>
                <div className={DROPDOWN_ITEM_STYLES}>test</div>
            </div>
        </div>
    );
}
SearchBar.displayName = 'Nordcom.Actionable.SearchBar';
