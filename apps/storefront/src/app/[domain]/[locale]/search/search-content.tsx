'use client';

import { Image as ShopifyImage } from '@shopify/hydrogen-react';
import { useCallback, useState } from 'react';
import { FiSearch } from 'react-icons/fi';

import { type Locale, type LocaleDictionary, useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/actionable/button';

//import type { Product, ProductFilters } from '@/api/product';
import { Product, ProductFilters } from '@/api/product';
import Link from '@/components/link';
import type { HTMLProps } from 'react';

type SearchBarProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    defaultValue?: string;
    onSearch: (q: string) => void;
    disabled?: boolean;
} & HTMLProps<HTMLDivElement>;
export const SearchBar = ({ defaultValue, onSearch, disabled, className, locale, i18n, ...props }: SearchBarProps) => {
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
                disabled={disabled}
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
                <FiSearch className="text-2xl" style={{ strokeWidth: 2.5 }} />
            </Button>
        </div>
    );
};

export type SearchContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    data: {
        products?: Product[];
        productFilters?: ProductFilters;
    };
};
export default function SearchContent({
    i18n,
    locale,
    data: { products = [], productFilters = [] }
}: SearchContentProps) {
    const { replace, push } = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { t } = useTranslation('common', i18n);

    console.log('products', products);

    return (
        <>
            <SearchBar
                locale={locale}
                i18n={i18n}
                defaultValue={searchParams.get('q')?.toString()}
                onSearch={async (q) => {
                    const params = new URLSearchParams(searchParams);
                    if (q) params.set('q', q);
                    else params.delete('q');

                    replace(`${pathname}?${params.toString()}`, { scroll: true });
                }}
            />

            <section>
                {productFilters.map(({ id, label, type, values }) => (
                    <div key={id}>
                        {label} - {type} - {JSON.stringify(values)}
                    </div>
                ))}
            </section>

            <section className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {products.map(({ id, title, handle, images, featuredImage, trackingParameters }) => {
                    const image = featuredImage || images.edges.find((image) => image)?.node;
                    const href = `/products/${handle}/${trackingParameters ? `?${trackingParameters}` : ''}`;

                    return (
                        <Link
                            href={href}
                            key={id}
                            className="group/item flex gap-2 overflow-clip rounded-lg border-2 border-solid border-gray-300 bg-gray-100 transition-shadow hover:shadow-lg"
                        >
                            <div className="flex aspect-square h-full w-28 grow-0 items-center justify-center overflow-hidden bg-white">
                                {image ? (
                                    <ShopifyImage
                                        className={'h-full w-full object-contain object-center p-2'}
                                        src={image.url!}
                                        alt={image.altText!}
                                        title={image.altText!}
                                        width={image.width || 75}
                                        height={image.height || 75}
                                        sizes="(max-width: 920px) 90vw, 500px"
                                        loading="eager"
                                        decoding="async"
                                    />
                                ) : null}
                            </div>

                            <div className="col-span-6 h-full w-full py-2 leading-tight">
                                {title} - {handle}
                            </div>
                        </Link>
                    );
                })}
            </section>
        </>
    );
}
