import 'server-only';

import { useMemo } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { cn } from '@/utils/tailwind';
import Image from 'next/image';

import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

/**
 * Props for `IconGrid`.
 */
export type IconGridProps = SliceComponentProps<
    Content.IconGridSlice,
    {
        shop: OnlineShop;
        locale: Locale;
        i18n: LocaleDictionary;
    }
>;

/**
 * Component for "IconGrid" Slices.
 */
const IconGrid = ({ slice, index: order }: IconGridProps) => {
    const background = slice.primary.background;
    const sliceItems: IconGridProps['slice']['items'] = (slice as any).items || [];

    const items = useMemo(
        () =>
            sliceItems.map(({ icon, title }, index) => {
                const priority = order < 2;

                return (
                    <div
                        key={`${title}_${index}`}
                        className={cn(
                            'flex items-center justify-center gap-4 rounded-lg border-2 border-solid border-transparent p-4',
                            background === 'primary' && 'bg-primary text-primary-foreground border-primary-dark',
                            background === 'secondary' &&
                                'bg-secondary-light text-secondary-foreground border-secondary'
                        )}
                    >
                        {icon.url ? (
                            <Image
                                role={icon.alt ? undefined : 'presentation'}
                                className="h-8 w-8 select-none object-contain object-center md:h-6 md:w-6"
                                style={{ strokeWidth: 2.5 }}
                                src={icon.url}
                                alt={icon.alt!}
                                width={35}
                                height={35}
                                quality={75}
                                decoding="async"
                                loading={priority ? 'eager' : 'lazy'}
                                priority={priority}
                                draggable={false}
                            />
                        ) : null}
                        <div className="text-sm font-semibold leading-tight lg:text-base">{title}</div>
                    </div>
                );
            }),
        [background, order, sliceItems]
    );

    if (!(slice as any) || items.length <= 0) {
        return null;
    }

    return (
        <section
            className="grid w-full grid-cols-1 gap-2 md:grid-cols-3"
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            {items}
        </section>
    );
};
IconGrid.displayName = 'Nordcom.Slices.IconGrid';

export default IconGrid;
