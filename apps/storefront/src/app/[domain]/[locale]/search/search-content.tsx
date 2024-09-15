'use client';

import { useCallback, useEffect, useState } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';

//import type { Product, ProductFilters } from '@/api/product';
import { createProductSearchParams, type Product, type ProductFilters } from '@/api/product';
import { type Locale, type LocaleDictionary, useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/actionable/button';
import { Filters } from '@/components/actionable/filters';
import Link from '@/components/link';
import { Label } from '@/components/typography/label';

import type { HTMLProps } from 'react';

type SearchBarProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    defaultValue?: string;
    onSearch: (q: string) => void;
    disabled?: boolean;
} & HTMLProps<HTMLDivElement>;
export const SearchBar = ({ defaultValue, onSearch, disabled, className, i18n, ...props }: SearchBarProps) => {
    const { t } = useTranslation('common', i18n);
    const [value, setValue] = useState<string>(defaultValue ?? '');

    const performSearch = useCallback(() => {
        onSearch(value);
    }, [onSearch, value]);

    return (
        <div className={cn('flex h-14 overflow-clip rounded-lg bg-white', className)} {...props}>
            <input
                name="query"
                className="grow rounded-l-lg border-2 border-r-0 border-solid border-gray-300 px-4 py-2"
                type="search"
                value={value}
                onChange={({ target: { value } }) => setValue(value)}
                onKeyDown={({ preventDefault, key }) => {
                    preventDefault();
                    if (key === 'Enter') {
                        performSearch();
                    }
                }}
                onBlur={(e) => {
                    e.preventDefault();
                    performSearch();
                }}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus={true}
                spellCheck={true}
                /* TODO: Make this copy configurable. */
                placeholder="Search for products, brands, categories, collections, and more..."
            />

            <Button
                className="bg-primary text-primary-foreground flex w-14 items-center justify-center rounded-br-none rounded-tr-none"
                onClick={(e: any) => {
                    e.preventDefault();
                    performSearch();
                }}
                title={t('search')}
                styled={false}
                disabled={disabled}
                type="submit"
            >
                <HiOutlineSearch className="text-xl lg:text-2xl" style={{ strokeWidth: 2.5 }} />
            </Button>
        </div>
    );
};

export type SearchContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    showFilters?: boolean;
    data: {
        products?: Product[];
        productFilters?: ProductFilters;
    };
};
export default function SearchContent({
    i18n,
    locale,
    showFilters = false,
    data: { products = [], productFilters = [] }
}: SearchContentProps) {
    const { replace } = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [searching, setSearching] = useState<boolean>(false);

    useEffect(() => {
        setSearching(false);
    }, [searchParams]);

    const commonStyles = 'rounded-lg border border-solid border-gray-300 p-4 lg:max-w-56 gap-1';
    const commonItemStyles =
        'group/item h-28 overflow-clip rounded-lg border-2 border-solid border-gray-300 bg-gray-100 lg:h-36';

    return (
        <>
            <SearchBar
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
                        setSearching(true);
                    } else {
                        params.delete('q');
                    }

                    replace(`${pathname}?${params.toString()}`, { scroll: true });
                }}
            />

            {showFilters ? <Filters filters={productFilters} /> : null}

            <section className="grid grid-cols-1 gap-2 empty:hidden md:grid-cols-3 lg:grid-cols-4">
                {searching === true ? (
                    <>
                        {new Array(6).fill(0).map((_, index) => (
                            <div key={index} className={commonItemStyles} data-skeleton></div>
                        ))}
                    </>
                ) : null}

                {(!searching ? products : []).map(
                    ({
                        id,
                        title,
                        handle,
                        images,
                        featuredImage,
                        trackingParameters,
                        productType,
                        vendor,
                        availableForSale
                    }) => {
                        const image: Product['images']['edges'][number]['node'] | undefined =
                            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                            featuredImage ?? images.edges.at(0)?.node;

                        const params = createProductSearchParams({ product: { trackingParameters } });
                        const href = `/products/${handle}/${params ? `?${params}` : ''}`;

                        return (
                            <Link
                                href={href}
                                key={id}
                                className={cn(
                                    commonItemStyles,
                                    'hover:text-primary flex gap-2 transition-shadow hover:shadow-lg lg:gap-4',
                                    !availableForSale && 'border-gray-100 opacity-35 brightness-75'
                                )}
                            >
                                <div className="flex aspect-square h-full w-auto shrink-0 grow-0 items-center justify-center overflow-hidden bg-white p-2">
                                    {image ? (
                                        <Image
                                            className={'aspect-square h-full object-contain object-center'}
                                            src={image.url!}
                                            alt={image.altText!}
                                            title={image.altText!}
                                            width={image.width || 75}
                                            height={image.height || 75}
                                            sizes="(max-width: 920px) 90vw, 500px"
                                            loading="eager"
                                            decoding="async"
                                            draggable={false}
                                        />
                                    ) : null}
                                </div>

                                <div className="col-span-6 flex h-full w-full flex-col gap-1 py-2 pr-2 leading-tight lg:py-4">
                                    <Label className="overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-none opacity-75">
                                        {vendor}
                                    </Label>

                                    <div className="font-medium leading-none">
                                        {title} &mdash; {productType}
                                    </div>
                                </div>
                            </Link>
                        );
                    }
                )}
            </section>
        </>
    );
}
