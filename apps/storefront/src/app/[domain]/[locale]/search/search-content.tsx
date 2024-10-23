'use client';

import { useCallback, useState, useTransition } from 'react';

//import type { Product, ProductFilters } from '@/api/product';
import { createProductSearchParams, isProductVegan, type Product, type ProductFilters } from '@/api/product';
import { capitalize, getTranslations, type Locale, type LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { Search as SearchIcon } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/actionable/button';
import { Filters } from '@/components/actionable/filters';
import Link from '@/components/link';
import { COMMON_BADGE_STYLES } from '@/components/product-card/product-card-badges';
import { AttributeIcon } from '@/components/products/attribute-icon';
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
    const { t } = getTranslations('common', i18n);
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
                    if (e.target.value.length <= 0) {
                        return;
                    }

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
                <SearchIcon className="text-xl lg:text-2xl" style={{ strokeWidth: 2.5 }} />
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

            <section className="grid grid-cols-1 gap-2 empty:hidden md:grid-cols-3 lg:grid-cols-4">
                {isPending ? (
                    <>
                        {new Array(6).fill(0).map((_, index) => (
                            <div
                                key={index}
                                className="h-28 select-none rounded-lg border-2 border-solid border-gray-200 bg-gray-100"
                                style={{
                                    '--animation-delay': `${150 * (index + 1)}ms`
                                }}
                                data-skeleton
                            />
                        ))}
                    </>
                ) : null}

                {(!isPending ? products : []).map((product) => {
                    const {
                        id,
                        title,
                        handle,
                        images,
                        featuredImage,
                        trackingParameters,
                        productType,
                        vendor,
                        availableForSale
                    } = product;

                    const image: Product['images']['edges'][number]['node'] | undefined =
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        featuredImage ?? images.edges.at(0)?.node;

                    const params = createProductSearchParams({ product: { trackingParameters } });
                    const href = `/products/${handle}/${params ? `?${params}` : ''}`;

                    let productTypeElement = null;
                    if (productType) {
                        productTypeElement = (
                            <span
                                data-nosnippet={true}
                                className="group-hover/item:text-primary contents text-lg font-semibold leading-none text-gray-700 transition-colors"
                            >
                                {' '}
                                &ndash; {productType}
                            </span>
                        );
                    }

                    const isVegan = isProductVegan(product);

                    return (
                        <Link
                            href={href}
                            key={id}
                            className={cn(
                                'group/item hover:text-primary relative flex h-28 select-none gap-2 overflow-hidden rounded-lg border-2 border-solid border-gray-200 bg-gray-100 transition-shadow hover:border-gray-300 hover:drop-shadow focus-visible:border-gray-400 lg:h-36 lg:gap-4',
                                !availableForSale && 'opacity-35 brightness-75'
                            )}
                        >
                            <div className="flex aspect-square h-full w-auto shrink-0 grow-0 items-center justify-center overflow-hidden bg-white p-2">
                                {image ? (
                                    <Image
                                        className="aspect-square h-full object-contain object-center transition-transform group-hover/item:scale-110"
                                        role={image.altText ? undefined : 'presentation'}
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

                            <div className="col-span-6 flex h-full w-full flex-col gap-1 py-2 pr-2 leading-tight *:transition-colors lg:py-4">
                                <Label className="group-hover/item:text-primary pt-2 text-sm font-medium normal-case leading-snug text-gray-700 duration-75">
                                    {vendor}
                                </Label>

                                <div className="group-hover/item:text-primary transition-color flex grow items-start justify-start gap-0 pr-1 text-lg font-bold leading-tight text-current duration-75">
                                    {title}
                                    {productTypeElement}
                                </div>
                            </div>

                            {isVegan && (
                                <div
                                    className={cn(COMMON_BADGE_STYLES, 'absolute left-1 top-1 bg-green-600 text-white')}
                                >
                                    <AttributeIcon data={'vegan'} className="text-lg" />
                                    {capitalize(t('vegan'))}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </section>
        </>
    );
}
