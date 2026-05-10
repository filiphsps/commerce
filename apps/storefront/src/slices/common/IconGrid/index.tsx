import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import Image from 'next/image';
import { useMemo } from 'react';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

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

    const items = useMemo(() => {
        const sliceItems: Array<{ icon: { url?: string | null; alt?: string | null }; title: string }> =
            (slice as { items?: Array<{ icon: { url?: string | null; alt?: string | null }; title: string }> }).items ||
            [];

        return sliceItems.map(({ icon, title }, index) => {
            const priority = order < 2;

            return (
                <div
                    key={`${title}_${index}`}
                    className={cn(
                        'flex items-center justify-center gap-4 rounded-lg border-2 border-transparent border-solid p-4',
                        background === 'primary' && 'border-primary-dark bg-primary text-primary-foreground',
                        background === 'secondary' && 'border-secondary bg-secondary-light text-secondary-foreground',
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
                    <div className="font-semibold text-sm leading-tight lg:text-base">{title}</div>
                </div>
            );
        });
    }, [slice, background, order]);

    if (!slice || items.length <= 0) {
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
